import { useEffect, useState } from "react"

const SPECIAL_HASHES = ["#replace", "#clear", "#back"]

export interface RouterOptions {
	/**
	 * A document.querySelector selector to be used for scroll restoration
	 *
	 * If undefined, window.scrollY will be used
	 */
	scrollElSelector?: string
}

/**
 * A declaration of a route to be passed to Router class constructor
 */
export interface RouteDef {
	/** Boolean indicating if should exact match. Defaults to false */
	exact?: boolean
	/** A function that returns a promise that resolves to a Svelte component */
	component: React.FC<any>
	/** Additional info you may want to track on your route, i.e. icon, description */
	meta?: Record<string, any>
	/**
	 * A unique path-mask for the route, to be used for pattern matching
	 *
	 * Example: '/hello/:name' will match '/hello/world' and '/hello/123'
	 * Example: '/hello/*' will match '/hello/world' and '/hello/world/green'
	 */
	path: string
	/** Boolean indicating if should be treated as a stack root */
	isStack?: boolean
}

/** A route to be shown when no match is found (aka 404) */
export interface NotFoundRouterDef {
	exact: false
	component: React.FC<any>
	meta?: never
	path: "/"
	isStack?: never
}

/**
 * An enhanced RouteDef with computed methods
 */
export interface Route extends RouteDef {
	/** Returns an object of URL args if path matches route.path, false otherwise */
	isMatch: (path: string) => false | Record<string, string>
	/** The unique key of this route */
	key: string
	/** Accepts url path args and returns a valid path from this routes path mask. Unknown args are added as query params */
	toPath: (urlParams?: Record<string, string>) => string
	/** A reference to a stack route, if the current route is in a stack */
	stack?: Route
	/** A history stack if the current route is a stack */
	stackHistory?: { href: string; scrollTop: number }[]
}

/** A map of route keys to routes */
type RoutesVal<T extends Record<string, RouteDef>> = {
	[key in keyof T]: Route
}

/** A route with the matching args */
export type RouteMatch = Route & { urlParams?: Record<string, string> }

export type RouterClass = typeof Router
export type RouterInstance = InstanceType<RouterClass>

/**
 * A class to manage and negotiate url paths
 *
 * @param routes
 * Accepts an Record of route keys to route definitions. Order by priority because
 * the first match will be returned when querying. The last route should always be
 * a 'notFound' route.
 *
 * @param options
 * An object of options
 *
 * @param options.scrollElSelector
 * A document.querySelector selector to be used for scroll restoration. If undefined,
 * window.scrollY will be used. Also, opacity on scrollElSelector is set to 1 on load,
 * which we leverage to fade in the page after a route change. This helps avoid screen
 * shift and flicker due to scroll restoration.
 */
export class Router<
	T extends {
		/** key: The unique key of a route */
		[key: string]: RouteDef
		/** A route to be shown when no match is found (aka 404) */
		notFound: NotFoundRouterDef
	},
> {
	/** A map of all the registered routes */
	routes: RoutesVal<T> = {} as any

	/**
	 * A document.querySelector selector to be used for scroll restoration
	 *
	 * If undefined, window.scrollY will be used.  Also, opacity on scrollElSelector
	 * is set to 1 on load, which we leverage to fade in the page after a route change
	 * This helps avoid screen shift and flicker due to scroll restoration.
	 */
	private scrollElSelector?: string

	/** An array of all the registered routes */
	get routeArray() {
		return Object.values(this.routes)
	}

	/** Entry snapshots keyed by sequence number (stored in history.state) */
	historyBySeq: Map<number, { route: Route; url: string; scrollTop: number }> = new Map()

	/** Monotonically increasing seq counter. Each pushState gets a unique seq. */
	private _seq = 0

	/** The seq of the entry we are currently on (matches history.state). */
	private currentSeq = -1

	/** Max entries to keep in historyBySeq (matching typical browser history limit) */
	private maxHistoryEntries = 50

	get current() {
		return {
			route: this.find(new URL(location.href)),
			url: location.href,
			path: location.pathname + (location.search ? location.search : ""),
			search: location.search,
			searchParams: new URLSearchParams(location.search),
			scrollTop:
				(this.scrollElSelector && document.querySelector(this.scrollElSelector)?.scrollTop) ||
				window.scrollY,
		}
	}

	/** What the scrollY should after a route change */
	private scrollNext = 0

	/** Timeout IDs for scroll restoration, cleared on each new navigation */
	private loadTimeouts: ReturnType<typeof setTimeout>[] = []

	/** An array of onChange callbacks, aka subscribers */
	private subscribers: ((route: RouteMatch) => any)[] = []

	/**
	 * A class to manage and negotiate url paths
	 *
	 * Accepts a map of route keys to route definitions. Order by priority because
	 * the first match will be returned when querying.
	 */
	constructor(routes: T, options: RouterOptions = {}) {
		Object.entries(routes).forEach(([k, routeDef]) => {
			this.routes[k as keyof T] = {
				...routeDef,
				isMatch: (path: string) => Router.isMatch(path, routeDef.path, routeDef.exact),
				key: k,
				stackHistory: routeDef.isStack ? [] : undefined,
				toPath: (urlParams = {}) => {
					const urlParamsTodo = { ...urlParams }
					let path = routeDef.path.replace(/:([^/]*)/g, (_, arg) => {
						const param = urlParamsTodo[arg]
						delete urlParamsTodo[arg]
						return encodeURIComponent(param)
					})
					// Append any remaining urlParams as query string using URLSearchParams
					const qs = new URLSearchParams(urlParamsTodo).toString()
					if (qs) {
						path += `?${qs}`
					}
					console.debug(`Router.toPath: ${k} => ${path}`)
					return path
				},
			}
		})
		this.routeArray
			.filter((r) => r.isStack)
			.forEach((r) => {
				this.routeArray.filter((r2) => r2.path.startsWith(r.path)).forEach((r2) => (r2.stack = r))
			})
		this.scrollElSelector = options.scrollElSelector
		this.hookHistory()
	}

	/**
	 * Returns the first route that matches the path
	 *
	 * Will always return a route, so long as you have a notFound route
	 */
	public find = (url: URL): RouteMatch => {
		for (const route of this.routeArray) {
			const urlParams = route.isMatch(url.pathname)
			if (urlParams) {
				const qs = Object.fromEntries(url.searchParams)
				return { ...route, urlParams: { ...qs, ...urlParams } }
			}
		}
		throw new Error(
			`No route found for path: ${url.pathname}. You may want to add a notFound route`,
		)
	}

	/** Navigate to a route */
	public goto = (routeOrKeyOrPath: Route | string, urlParams: Record<string, string> = {}) => {
		let gotoPath = ""
		if (
			typeof routeOrKeyOrPath === "string" &&
			(routeOrKeyOrPath.startsWith("http") || routeOrKeyOrPath.startsWith("/"))
		) {
			gotoPath = routeOrKeyOrPath
		} else {
			const route =
				typeof routeOrKeyOrPath === "string" ? this.routes[routeOrKeyOrPath] : routeOrKeyOrPath
			gotoPath = route.toPath(urlParams)
		}
		console.debug(`Router.goto: ${gotoPath}`)
		history.pushState(Date.now(), "", gotoPath)
	}

	/**
	 * To be called from a lazy component's onLoad event
	 *
	 * 1. Restore the scroll position after a route change
	 */
	public onLoad = () => {
		if (navigator.userAgent.includes("jsdom")) return
		this.loadTimeouts.forEach(clearTimeout)
		this.loadTimeouts = []
		const scrollToNext = () => this.scrollTo({ top: this.scrollNext })
		scrollToNext()
		this.loadTimeouts.push(setTimeout(scrollToNext, 100))
		this.loadTimeouts.push(setTimeout(scrollToNext, 200))
		this.loadTimeouts.push(setTimeout(scrollToNext, 300))
	}

	/** history.pushState, un pony-filled */
	public static pushStateRaw = globalThis.history?.pushState.bind(
		globalThis.history,
	) as typeof history.pushState

	/** Navigate to a route by replaceState */
	public replace = (routeOrKey: Route | string, urlParams: Record<string, string> = {}) => {
		let replacePath = ""
		if (
			typeof routeOrKey === "string" &&
			(routeOrKey.startsWith("http") || routeOrKey.startsWith("/"))
		) {
			replacePath = routeOrKey
		} else {
			const route = typeof routeOrKey === "string" ? this.routes[routeOrKey] : routeOrKey
			replacePath = route.toPath(urlParams)
		}
		history.replaceState(Date.now(), "", replacePath)
	}

	/** history.replaceState, un pony-filled */
	public static replaceStateRaw = globalThis.history?.replaceState.bind(
		globalThis.history,
	) as typeof history.replaceState

	/** Scroll the window or scrollElSelector if available  */
	public scrollTo(options: ScrollToOptions) {
		if (this.scrollElSelector) {
			const scrollEl = document.querySelector(this.scrollElSelector)
			if (!scrollEl) return
			scrollEl.scrollTo(options)
			// @ts-expect-error -- style property is missing from type
			scrollEl.style.setProperty("opacity", 1)
		} else {
			scrollTo(options)
		}
	}

	/** Subscribe to changes to the route */
	public subscribe = (fn: (route: RouteMatch) => any) => {
		this.subscribers.push(fn)
		return () => this.unsubscribe(fn)
	}

	/** Unsubscribe to changes to the route */
	public unsubscribe = (fn: (route: RouteMatch) => any) => {
		this.subscribers = this.subscribers.filter((l) => l !== fn)
	}

	/**
	 * A React hook to rerender when route changes
	 *
	 * It does not return the value, but subscribes to changes and forces re-render
	 * when the value changes.
	 *
	 * @usage
	 * ```tsx
	 *
	 * function MyComponent() {
	 *   r.use();
	 *   return <div>{r.current.route.path}</div>;
	 * }
	 * ```
	 */
	public use() {
		const [_, setValue] = useState(Date.now())
		useEffect(() => {
			return this.subscribe(() => setValue(Date.now()))
		}, [])
	}

	/**
	 * Intercept history.pushState, history.replaceState, and click events
	 */
	private hookHistory = () => {
		/**
		 * A custom pushState intercepts soft navigations, i.e. same origin
		 *
		 * 0. If the url has the same pathname and only a hash changed (and it's
		 *    not a special hash), let the browser handle the anchor natively
		 * 1. If hash is '#replace', call history.replaceState. Is convenient for
		 *    anchor tags so you dont need to use onClick or javascript
		 * 2. Clear the stack if,
		 *   a. the url is an inner page of a different stack than the current route
		 *   b. the hash is '#clear'
		 * 3. Pop the stack if,
		 *   a. The url is a stack root and is the same stack as the current route
		 *   b. the hash is '#back'
		 * 4. If the url is a stack child of the current stack, push the url to the
		 *    stack history
		 * 5. Store the current route in history with current scrollTop
		 * 6. Notify subscribers of the new route
		 */
		history.pushState = (date, unused, url) => {
			let urlObj = toUrlObj(url as any)

			if (
				typeof url === "string" &&
				(url.startsWith("file:") ||
					url.startsWith("mailto:") ||
					url.startsWith("sms:") ||
					url.startsWith("tel:"))
			) {
				return Router.pushStateRaw(date, unused, urlObj)
			}

			if (urlObj.hash === "#replace") {
				return history.replaceState(date, unused, urlObj)
			}

			if (urlObj.origin !== location.origin) {
				return Router.pushStateRaw(date, unused, urlObj)
			}

			if (
				urlObj.pathname === location.pathname &&
				urlObj.hash &&
				!SPECIAL_HASHES.includes(urlObj.hash) &&
				urlObj.search === location.search
			) {
				Router.pushStateRaw({ seq: this.currentSeq }, unused, urlObj)
				const el = document.getElementById(urlObj.hash.slice(1))
				if (el) el.scrollIntoView()
				return
			}

			if (urlObj.href === location.href) {
				this.scrollNext = 0
				this.scrollTo({ top: 0, behavior: "smooth" })
				Router.pushStateRaw(date, unused, urlObj)
				return
			}

			this.scrollNext = 0
			let next = this.find(urlObj)

			const navToInnerStackPageFromOutOfStack =
				next.stack && !next.isStack && next.stack.key !== this.current.route.stack?.key

			const isClear = next.stack && urlObj.hash === "#clear"
			if (isClear || navToInnerStackPageFromOutOfStack) {
				const clearSeq = ++this._seq
				this.historyBySeq.set(clearSeq, {
					url: location.href,
					route: this.current.route,
					scrollTop: this.current.scrollTop,
				})
				this.currentSeq = clearSeq
				next.stack!.stackHistory = []
				this.scrollNext = 0
				if (!navToInnerStackPageFromOutOfStack) {
					urlObj = toUrlObj(next.stack!.path as any)
					next = this.find(urlObj)
				}
			}

			// If the next route is a stack root, treat as if it's a #back
			const currentStack = this.current.route.stack
			const isBack =
				!isClear &&
				next.stack &&
				currentStack &&
				(urlObj.hash === "#back" || currentStack.key === next.key)

			if (isBack) {
				urlObj = toUrlObj(currentStack.path)
				next = this.find(urlObj)
			}

			if (!isClear && next.isStack && next.stackHistory?.length) {
				const recall = next.stackHistory.pop()!
				urlObj = new URL(recall.href)
				this.scrollNext = recall.scrollTop
				next = this.find(urlObj)
			}

			const seq = ++this._seq
			if (!isClear && !isBack) {
				this.current.route.stack?.stackHistory?.push({
					href: location.href,
					scrollTop:
						(this.scrollElSelector && document.querySelector(this.scrollElSelector)?.scrollTop) ||
						window.scrollY,
				})
				this.historyBySeq.set(seq, {
					url: location.href,
					route: this.current.route,
					scrollTop: this.current.scrollTop,
				})
				this.currentSeq = seq
				if (this.historyBySeq.size > this.maxHistoryEntries) {
					const oldestSeq = Math.min(...this.historyBySeq.keys())
					this.historyBySeq.delete(oldestSeq)
				}
			}

			;[...this.subscribers].forEach((fn) => fn(next))
			dispatchEvent(new CustomEvent("locationchange", { detail: next }))
			Router.pushStateRaw({ seq }, unused, urlObj)
		}
		history.replaceState = (date, unused, url) => {
			const urlObj = toUrlObj(url as any)
			const next = this.find(urlObj)
			const current = this.current
			if (this.currentSeq >= 0) {
				const entry = this.historyBySeq.get(this.currentSeq)
				if (entry) {
					entry.route = next
					entry.url = urlObj.href
					entry.scrollTop = current.scrollTop
				}
			}
			try {
				Router.replaceStateRaw({ seq: this.currentSeq }, unused, urlObj)
			} catch (e) {
				console.error("Router: replaceState failed", e)
				return
			}
			;[...this.subscribers].forEach((fn) => fn(next))
			dispatchEvent(new CustomEvent("locationchange", { detail: next }))
		}

		/* Listen for back/forward event. Use seq in history.state for exact lookups. */
		addEventListener("popstate", (e: PopStateEvent) => {
			const state = e.state as { seq?: number } | null
			const seq = state?.seq ?? -1
			const dest = this.historyBySeq.get(seq)
			const prevSeq = this.currentSeq

			if (dest) {
				if (seq < prevSeq) {
					dest.route.stack?.stackHistory?.pop()
				}
				this.scrollNext = dest.scrollTop
				this.currentSeq = seq
			} else {
				/* Navigated to a URL never recorded by this router */
				this.scrollNext = 0
				this.currentSeq = -1
			}

			const next = this.find(new URL(location.href))
			;[...this.subscribers].forEach((fn) => fn(next))
			dispatchEvent(new CustomEvent("locationchange", { detail: next }))
		})

		/** intercept anchor tag clicks */
		addEventListener("click", (e: any) => {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
			const ln = findLinkTagInParents(e.target) // aka linkNode
			if (!ln) return
			const lnUrl = new URL(ln.href)
			if (
				lnUrl.pathname === location.pathname &&
				lnUrl.hash &&
				!SPECIAL_HASHES.includes(lnUrl.hash) &&
				lnUrl.search === location.search &&
				(ln.href.startsWith(location.origin) || ln.href.startsWith("/")) &&
				ln.target !== "_blank"
			) {
				return
			}
			if (
				(ln?.href.startsWith(location.origin) || ln?.href.startsWith("/")) &&
				ln.target !== "_blank"
			) {
				e.preventDefault()
				history.pushState(Date.now(), "", ln.href)
			}
		})
	}

	/** Returns an object of URL params if path matches route.path, false otherwise */
	static isMatch = (path: string, pathMask: string, exact = true) => {
		const argRx = /:([^/]*)/g
		const urlRx = `^${escapeRegExp(pathMask).replace(argRx, "([^/]*)")}${exact ? "$" : ""}`
		const match = [...(path || "/").matchAll(new RegExp(urlRx, "g"))]?.[0]
		const urlParams = match
			? [...pathMask.matchAll(argRx)].reduce(
					(acc, arg, i) => ({ ...acc, [arg[1]]: match[i + 1] }),
					{},
				)
			: false
		return urlParams
	}
}

/**
 * Escapes regex metacharacters so a string can be used literally in a RegExp.
 */
const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Searches up the dom from an element to find an enclosing anchor tag
 */
function findLinkTagInParents(node: HTMLElement): any {
	if (node?.nodeName === "A") return node
	if (node?.parentNode) return findLinkTagInParents(node.parentElement!)
}

/**
 * Accepts a url string or a URL object and returns a URL object
 */
function toUrlObj(urlOrPath: string | URL) {
	if (urlOrPath instanceof URL) return urlOrPath
	if (urlOrPath.startsWith("//")) {
		urlOrPath = location.protocol + urlOrPath
	}
	if (!urlOrPath.startsWith("http")) {
		if (urlOrPath[0] !== "/") urlOrPath = `/${urlOrPath}`
		urlOrPath = location.origin + urlOrPath
	}
	return new URL(urlOrPath)
}
