import { useEffect, useState } from "react"

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
	/** Boolean indicating if should fuzzy match. Defaults to false */
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

	/** Custom history so we can restore scroll on back */
	history: { route: Route; url: string; scrollTop: number }[] = []

	get current() {
		return {
			route: this.find(new URL(location.href)),
			url: location.href,
			path: location.pathname + (location.search ? location.search : ""),
			search: location.search,
			scrollTop:
				(this.scrollElSelector && document.querySelector(this.scrollElSelector)?.scrollTop) ||
				window.scrollY,
		}
	}
	get previous() {
		return this.history.at(-1)
	}

	/** What the scrollY should after a route change */
	private scrollNext = 0

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
						return param
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
				return { ...route, urlParams: { ...urlParams, ...qs } }
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
		const scrollToNext = () => this.scrollTo({ top: this.scrollNext })
		scrollToNext()
		setTimeout(scrollToNext, 100)
		setTimeout(scrollToNext, 200)
		setTimeout(scrollToNext, 300)
	}

	/** Navigate to a route by replaceState */
	public replace = (routeOrKey: Route | string, urlParams: Record<string, string> = {}) => {
		const route = typeof routeOrKey === "string" ? this.routes[routeOrKey] : routeOrKey
		history.replaceState(Date.now(), "", route.toPath(urlParams))
	}

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
		useEffect(() => this.subscribe(() => setValue(Date.now())), [])
	}

	/**
	 * Intercept history.pushState, history.replaceState, and click events
	 */
	private hookHistory = () => {
		const pushStateOrig = history.pushState.bind(history)
		const replaceStateOrig = history.replaceState.bind(history)

		/**
		 * A custom pushState intercepts soft navigations, i.e. same origin
		 *
		 * 0. If the url is the same as current url, just scroll to top
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

			if (urlObj.hash === "#replace") {
				return history.replaceState(date, unused, urlObj)
			}

			if (urlObj.origin !== location.origin) {
				return pushStateOrig(date, unused, urlObj)
			}

			if (urlObj.href === location.href) {
				this.scrollNext = 0
				this.scrollTo({ top: 0, behavior: "smooth" })
				return
			}

			this.scrollNext = 0
			let next = this.find(urlObj)

			const navToInnerStackPageFromOutOfStack =
				next.stack && !next.isStack && next.stack.key !== this.current.route.stack?.key

			const isClear = next.stack && urlObj.hash === "#clear"
			if (isClear || navToInnerStackPageFromOutOfStack) {
				next.stack!.stackHistory = []
				this.scrollNext = 0
				if (!navToInnerStackPageFromOutOfStack) {
					urlObj = toUrlObj(next.stack!.path as any)
					next = this.find(urlObj)
				}
			}

			// If the next route is a stack root, treat as if it's a #back
			const isBack =
				!isClear &&
				next.stack &&
				(urlObj.hash === "#back" || this.current.route.stack?.key === next.key)

			if (isBack) {
				urlObj = toUrlObj(this.current.route.stack?.path as any)
				next = this.find(urlObj)
			}

			if (!isClear && next.isStack && next.stackHistory?.length) {
				const recall = next.stackHistory.pop()!
				urlObj = new URL(recall.href)
				this.scrollNext = recall.scrollTop
				next = this.find(urlObj)
			}

			if (!isClear && !isBack) {
				this.current.route.stack?.stackHistory?.push({
					href: location.href,
					scrollTop:
						(this.scrollElSelector && document.querySelector(this.scrollElSelector)?.scrollTop) ||
						window.scrollY,
				})
				this.history.push(this.current)
			}

			this.subscribers.forEach((fn) => fn(next))
			dispatchEvent(new CustomEvent("locationchange", { detail: next }))
			pushStateOrig(date, unused, urlObj)
		}
		history.replaceState = (date, unused, url) => {
			const urlObj = toUrlObj(url as any)
			const next = this.find(urlObj)
			this.subscribers.forEach((fn) => fn(next))
			dispatchEvent(new CustomEvent("locationchange", { detail: next }))
			replaceStateOrig(date, unused, urlObj)
		}

		/* Listen for back/forward event. Sadly we can't detect back vs forward */
		addEventListener("popstate", () => {
			this.previous?.route.stack?.stackHistory?.pop()
			this.scrollNext = this.previous?.scrollTop || 0
			this.history.pop()
			const next = this.find(new URL(location.href))
			this.subscribers.forEach((fn) => fn(next))
			dispatchEvent(new CustomEvent("locationchange", { detail: next }))
		})

		/** intercept anchor tag clicks */
		addEventListener("click", (e: any) => {
			if (e.metaKey || e.ctrlKey) return
			const ln = findLinkTagInParents(e.target) // aka linkNode
			if (ln && ln.target !== "_blank") {
				e.preventDefault()
				history.pushState(Date.now(), "", ln.href)
			}
		})
	}

	/** Returns an object of URL params if path matches route.path, false otherwise */
	static isMatch = (path: string, pathMask: string, exact = true) => {
		const argRx = /:([^/]*)/g
		const urlRx = `^${pathMask.replace(argRx, "([^/]*)")}${exact ? "$" : ""}`
		const match = [...(path || "/").matchAll(new RegExp(urlRx, "gi"))]?.[0]
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
