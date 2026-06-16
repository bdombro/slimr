import { ObservableR } from "@slimr/observable/react"

/**
 * Special hash fragments used as navigation instructions to control history
 * updates (e.g., replacing the history entry, clearing nested stack history,
 * or initiating back navigation).
 */
const SPECIAL_HASHES = ["#replace", "#clear", "#back"]

/**
 * A read-only representation of an Observable containing a state value.
 */
type ReadonlyObs<T> = Pick<ObservableR<T>, "name" | "use" | "subscribe"> & {
	/** The current value of the observable. */
	readonly val: T
}

/**
 * Configuration options for the Router instance.
 */
export interface RouterOptions {
	/** Optional CSS selector for the scrollable element to restore scroll positions on. */
	scrollElSelector?: string
	/** Optional CSS selector for the page element whose opacity is reset after navigation. */
	pageElSelector?: string
}

/**
 * A basic definition for a route.
 */
export interface RouteDef {
	/** Whether the path should be matched exactly. */
	exact?: boolean
	/** The React component to render when the route matches. */
	component: React.FC<any>
	/** Optional metadata associated with the route. */
	meta?: Record<string, any>
	/** The path mask pattern to match against (e.g. '/user/:id'). */
	path: string
	/** Whether the route operates as a stack (preserving stack page history). */
	isStack?: boolean
}

/**
 * The specialized route definition used for the fallback page when no routes match.
 */
export interface NotFoundRouterDef {
	/** The fallback route is never matched exactly. */
	exact: false
	/** The React component to render for the not-found view. */
	component: React.FC<any>
	/** Fallback routes cannot have custom metadata. */
	meta?: never
	/** The path for the fallback route is always '/'. */
	path: "/"
	/** Fallback routes cannot be stack routes. */
	isStack?: never
}

/**
 * Represents a parsed and compiled route.
 */
export interface Route extends RouteDef {
	/** Evaluates if a given path matches this route, returning path parameters if it matches. */
	isMatch: (path: string) => false | Record<string, string>
	/** The unique key identifying this route in the routing table. */
	key: string
	/** Resolves the route path using the provided parameters. */
	toPath: (urlParams?: Record<string, string>) => string
	/** The parent stack route if this route is nested under one. */
	stack?: Route
	/** The history stack containing URLs and scroll positions for back-navigation. */
	stackHistory?: { href: string; scrollTop: number }[]
}

/**
 * Maps a set of route definitions to their compiled Route counterparts.
 */
type RoutesVal<T extends Record<string, RouteDef>> = {
	[key in keyof T]: Route
}

/**
 * A Route representation that has successfully matched the current URL, including extracted URL parameters.
 */
export type RouteMatch = Route & {
	/** Extracted path and query parameters from the matched URL. */
	urlParams?: Record<string, string>
}

/**
 * The type of the Router class constructor.
 */
export type RouterClass = typeof Router

/**
 * The type of a Router class instance.
 */
export type RouterInstance = InstanceType<RouterClass>

export class Router<
	T extends {
		[key: string]: RouteDef
		notFound: NotFoundRouterDef
	},
> {
	/** The compiled routes map for the router. */
	routes: RoutesVal<T> = {} as any

	/** The CSS selector for the scrollable container. */
	private scrollElSelector?: string

	/** The CSS selector for the page element whose opacity is reset after navigation. */
	private pageElSelector?: string

	/**
	 * Returns all compiled route objects as an array.
	 */
	get routeArray() {
		return Object.values(this.routes)
	}

	/** Map storing history state details (route, URL, and scrollTop) by sequence number. */
	historyBySeq: Map<number, { route: Route; url: string; scrollTop: number }> = new Map()

	/** Internal sequence counter for history navigation entries. */
	private _seq = 0

	/** The sequence number of the current active history entry. */
	private currentSeq = -1

	/** The maximum number of entries to keep in historyBySeq before pruning. */
	private maxHistoryEntries = 50

	/**
	 * Returns the current router state including active route, URL, path, query params, and scroll position.
	 */
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

	/** The scroll position to apply next, usually when a page load completes. */
	private scrollNext = 0

	/** Pending setTimeout IDs for scroll restoration triggers. */
	private loadTimeouts: ReturnType<typeof setTimeout>[] = []

	/** The private reactive observable storing the current matched route. */
	private _route$: ObservableR<RouteMatch>

	/** The private reactive observable storing the current URLSearchParams. */
	private _searchParams$: ObservableR<URLSearchParams>

	/**
	 * Returns the read-only observable stream for the active matched route.
	 */
	get route$(): ReadonlyObs<RouteMatch> {
		return this._route$
	}

	/**
	 * Returns the read-only observable stream for the active query parameters.
	 */
	get searchParams$(): ReadonlyObs<URLSearchParams> {
		return this._searchParams$
	}

	/**
	 * Initializes the Router instance.
	 *
	 * This compiles the provided route definitions (attaching matching logic, parameter extraction,
	 * and nested stack associations), sets up initial reactive state from the current window location,
	 * and hooks history APIs and DOM link clicks to manage navigation dynamically.
	 *
	 * @param routes - The routes configuration mapping keys to RouteDefs.
	 * @param options - Additional options for router behavior (e.g. scroll container configuration).
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
		this.pageElSelector = options.pageElSelector
		this._route$ = new ObservableR("route$", this.find(new URL(location.href)))
		this._searchParams$ = new ObservableR("searchParams$", new URLSearchParams(location.search))
		this.hookHistory()
	}

	/**
	 * Finds the matching route definitions and parsed parameters for a given URL.
	 *
	 * @param url - The URL to match against the route definitions.
	 * @returns The matched route with merged route parameters.
	 * @throws Error if no matching route is found.
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

	/**
	 * Navigates to a route, a route key, or a URL path.
	 *
	 * @param routeOrKeyOrPath - A Route object, a registered route key, or a URL/path string.
	 * @param urlParams - Optional parameters to interpolate into the path or append as a query string.
	 */
	public goto = (routeOrKeyOrPath: Route | string, urlParams: Record<string, string> = {}) => {
		let gotoPath = ""
		if (typeof routeOrKeyOrPath !== "string") {
			gotoPath = routeOrKeyOrPath.toPath(urlParams)
		} else if (isUrlOrPath(routeOrKeyOrPath)) {
			gotoPath = routeOrKeyOrPath
		} else {
			gotoPath = this.routes[routeOrKeyOrPath].toPath(urlParams)
		}
		console.debug(`Router.goto: ${gotoPath}`)
		history.pushState(Date.now(), "", gotoPath)
	}

	/**
	 * Restores the target scroll position after a navigation event.
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

	/** The original raw history.pushState method bound to the global history. */
	public static pushStateRaw = globalThis.history?.pushState.bind(
		globalThis.history,
	) as typeof history.pushState

	/**
	 * Replaces the current history entry with a new route, route key, or URL path.
	 *
	 * @param routeOrKey - A Route object, a registered route key, or a URL/path string.
	 * @param urlParams - Optional parameters to interpolate into the path or append as a query string.
	 */
	public replace = (routeOrKey: Route | string, urlParams: Record<string, string> = {}) => {
		let replacePath = ""
		if (typeof routeOrKey !== "string") {
			replacePath = routeOrKey.toPath(urlParams)
		} else if (isUrlOrPath(routeOrKey)) {
			replacePath = routeOrKey
		} else {
			replacePath = this.routes[routeOrKey].toPath(urlParams)
		}
		history.replaceState(Date.now(), "", replacePath)
	}

	/** The original raw history.replaceState method bound to the global history. */
	public static replaceStateRaw = globalThis.history?.replaceState.bind(
		globalThis.history,
	) as typeof history.replaceState

	/**
	 * Scrolls to the given scroll options, targeting the configured scroll element if specified,
	 * otherwise the window.
	 *
	 * @param options - Standard scroll options specifying scroll behavior and destination.
	 */
	public scrollTo(options: ScrollToOptions) {
		if (this.scrollElSelector) {
			const scrollEl = document.querySelector(this.scrollElSelector)
			if (scrollEl) {
				scrollEl.scrollTo(options)
			}
		} else {
			scrollTo(options)
		}
		if (this.pageElSelector) {
			const pageEl = document.querySelector(this.pageElSelector)
			if (pageEl) (pageEl as HTMLElement).style.setProperty("opacity", "1")
		}
	}

	/**
	 * Intercepts history manipulation, navigation events, and anchor clicks to enable single-page routing.
	 */
	private hookHistory = () => {
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

			this._route$.set(next)
			this._searchParams$.set(new URLSearchParams(urlObj.search))
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
			this._route$.set(next)
			this._searchParams$.set(new URLSearchParams(urlObj.search))
			dispatchEvent(new CustomEvent("locationchange", { detail: next }))
		}

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
				this.scrollNext = 0
				this.currentSeq = -1
			}

			const next = this.find(new URL(location.href))
			this._route$.set(next)
			this._searchParams$.set(new URLSearchParams(location.search))
			dispatchEvent(new CustomEvent("locationchange", { detail: next }))
		})

		addEventListener("click", (e: any) => {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
			const ln = findLinkTagInParents(e.target)
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

	/**
	 * Checks if a path matches a given path mask, optionally requiring an exact match.
	 *
	 * @param path - The pathname to test.
	 * @param pathMask - The route path mask (e.g. '/user/:id').
	 * @param exact - Whether the match must be exact.
	 * @returns An object of route parameters if matched, otherwise false.
	 */
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
 * Escapes special regex characters in a string.
 *
 * @param str - The string to escape.
 * @returns The escaped string.
 */
const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Recursively traverses up the DOM tree from a node to find the nearest anchor element.
 *
 * @param node - The starting HTML element.
 * @returns The nearest ancestor anchor element, or undefined if none exists.
 */
function findLinkTagInParents(node: HTMLElement): any {
	if (node?.nodeName === "A") return node
	if (node?.parentNode) return findLinkTagInParents(node.parentElement!)
}

/**
 * Checks if a string contains an absolute URL or external protocol scheme.
 *
 * @param str - The string to check.
 * @returns True if the string represents an absolute URL or external scheme.
 */
function isUrl(str: string): boolean {
	return /^[a-z][a-z0-9+.-]*:/i.test(str)
}

/**
 * Checks if a string is an absolute URL, external protocol scheme, or an absolute path.
 *
 * @param str - The string to check.
 * @returns True if the string is a URL, external scheme, or starts with a forward slash.
 */
function isUrlOrPath(str: string): boolean {
	return isUrl(str) || str.startsWith("/")
}

/**
 * Normalizes a path or URL string (or URL object) into a standard URL object, resolving
 * relative paths against the current origin.
 *
 * @param urlOrPath - The path, URL string, or URL object.
 * @returns A standardized URL object.
 */
function toUrlObj(urlOrPath: string | URL) {
	if (urlOrPath instanceof URL) return urlOrPath
	if (urlOrPath.startsWith("//")) {
		urlOrPath = location.protocol + urlOrPath
	}
	// normalize the url to a full URL and not just a path
	if (!isUrl(urlOrPath)) {
		if (urlOrPath[0] !== "/") urlOrPath = `/${urlOrPath}`
		urlOrPath = location.origin + urlOrPath
	}
	return new URL(urlOrPath)
}
