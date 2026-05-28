import { ObservableR } from "@slimr/observable/react"

const SPECIAL_HASHES = ["#replace", "#clear", "#back"]

type ReadonlyObs<T> = Pick<ObservableR<T>, "name" | "use" | "subscribe"> & {
	readonly val: T
}

export interface RouterOptions {
	scrollElSelector?: string
}

export interface RouteDef {
	exact?: boolean
	component: React.FC<any>
	meta?: Record<string, any>
	path: string
	isStack?: boolean
}

export interface NotFoundRouterDef {
	exact: false
	component: React.FC<any>
	meta?: never
	path: "/"
	isStack?: never
}

export interface Route extends RouteDef {
	isMatch: (path: string) => false | Record<string, string>
	key: string
	toPath: (urlParams?: Record<string, string>) => string
	stack?: Route
	stackHistory?: { href: string; scrollTop: number }[]
}

type RoutesVal<T extends Record<string, RouteDef>> = {
	[key in keyof T]: Route
}

export type RouteMatch = Route & { urlParams?: Record<string, string> }

export type RouterClass = typeof Router
export type RouterInstance = InstanceType<RouterClass>

export class Router<
	T extends {
		[key: string]: RouteDef
		notFound: NotFoundRouterDef
	},
> {
	routes: RoutesVal<T> = {} as any

	private scrollElSelector?: string

	get routeArray() {
		return Object.values(this.routes)
	}

	historyBySeq: Map<number, { route: Route; url: string; scrollTop: number }> = new Map()

	private _seq = 0

	private currentSeq = -1

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

	private scrollNext = 0

	private loadTimeouts: ReturnType<typeof setTimeout>[] = []

	private _route$: ObservableR<RouteMatch>
	private _searchParams$: ObservableR<URLSearchParams>

	get route$(): ReadonlyObs<RouteMatch> {
		return this._route$
	}

	get searchParams$(): ReadonlyObs<URLSearchParams> {
		return this._searchParams$
	}

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
		this._route$ = new ObservableR("route$", this.find(new URL(location.href)))
		this._searchParams$ = new ObservableR("searchParams$", new URLSearchParams(location.search))
		this.hookHistory()
	}

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

	public static pushStateRaw = globalThis.history?.pushState.bind(
		globalThis.history,
	) as typeof history.pushState

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

	public static replaceStateRaw = globalThis.history?.replaceState.bind(
		globalThis.history,
	) as typeof history.replaceState

	public scrollTo(options: ScrollToOptions) {
		if (this.scrollElSelector) {
			const scrollEl = document.querySelector(this.scrollElSelector)
			if (!scrollEl) return
			scrollEl.scrollTo(options)
			// @ts-expect-error
			scrollEl.style.setProperty("opacity", 1)
		} else {
			scrollTo(options)
		}
	}

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

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function findLinkTagInParents(node: HTMLElement): any {
	if (node?.nodeName === "A") return node
	if (node?.parentNode) return findLinkTagInParents(node.parentElement!)
}

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
