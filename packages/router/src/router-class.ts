/* eslint-disable @typescript-eslint/no-explicit-any */
export interface RouteDef {
  /** Boolean indicating if should fuzzy match. Defaults to false */
  exact?: boolean
  /** A function that returns a promise that resolves to a Svelte component */
  loader: () => Promise<any>
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

export interface Route extends RouteDef {
  /** Returns an object of URL args if path matches route.path, false otherwise */
  isMatch: (path: string) => false | Record<string, string>
  /** The unique key of this route */
  key: string
  /** Accepts path args and returns a valid path from this routes path mask */
  toPath: (urlParams?: Record<string, string>) => string
  /** A reference to a stack route, if the current route is in a stack */
  stack?: Route
  /** A history stack if the current route is a stack */
  stackHistory?: {url: string; scrollTop: number}[]
}

/** A map of route keys to routes */
type RoutesVal<T extends Record<string, RouteDef>> = {
  [key in keyof T]: Route
}

/** A route with the matching args */
export type RouteMatch = Route & {urlParams?: Record<string, string>}

export type RouterClass = typeof Router
export type RouterInstance = InstanceType<RouterClass>

/**
 * Searches up the dom from an element to find an enclosing anchor tag
 */
function findLinkTagInParents(node: HTMLElement): any {
  if (node?.nodeName === 'A') return node
  if (node?.parentNode) return findLinkTagInParents(node.parentElement!)
}

/**
 * Accepts a url string or a URL object and returns a URL object
 */
function toUrlObj(urlOrPath: string | URL) {
  if (urlOrPath instanceof URL) return urlOrPath
  if (urlOrPath.startsWith('//')) {
    urlOrPath = location.protocol + urlOrPath
  }
  if (!urlOrPath.startsWith('http')) {
    if (urlOrPath[0] !== '/') urlOrPath = '/' + urlOrPath
    urlOrPath = location.origin + urlOrPath
  }
  return new URL(urlOrPath)
}

/**
 * A class to manage and negotiate url paths
 *
 * Accepts a map of route keys to route definitions. Order by priority because
 * the first match will be returned when querying.
 */
export class Router<
  T extends {
    /** key: The unique key of a route */
    [key: string]: RouteDef
  }
> {
  /** A map of all the registered routes */
  routes: RoutesVal<T> = {} as any

  /** An array of all the registered routes */
  get routeArray() {
    return Object.values(this.routes)
  }

  /** Custom history so we can restore scroll on back */
  history: {route: Route; url: string; scrollTop: number}[] = []

  get current() {
    return {
      route: this.find(new URL(location.href)),
      url: location.href,
      scrollTop: window.scrollY,
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
  constructor(routes: T) {
    Object.entries(routes).forEach(([k, routeDef]) => {
      this.routes[k as keyof T] = {
        ...routeDef,
        isMatch: (path: string) => Router.isMatch(path, routeDef.path, routeDef.exact),
        key: k,
        stackHistory: routeDef.isStack ? [] : undefined,
        toPath: (urlParams = {}) => {
          return routeDef.path.replace(/:([^/]*)/g, (_, arg) => urlParams[arg])
        },
      }
    })
    this.routeArray
      .filter(r => r.isStack)
      .forEach(r => {
        this.routeArray.filter(r2 => r2.path.startsWith(r.path)).forEach(r2 => (r2.stack = r))
      })
    this.hookHistory()
  }

  /** Returns the first route that matches the path */
  public find = (url: URL): RouteMatch => {
    for (const route of this.routeArray) {
      const urlParams = route.isMatch(url.pathname)
      if (urlParams) {
        const qs = Object.fromEntries(url.searchParams)
        return {...route, urlParams: {...urlParams, ...qs}}
      }
    }
    throw new Error(`No route found for path: ${url.pathname}`)
  }

  /** Navigate to a route */
  public goto = (routeOrKey: Route | string, urlParams: Record<string, string> = {}) => {
    const route = typeof routeOrKey === 'string' ? this.routes[routeOrKey] : routeOrKey
    history.pushState(Date.now(), '', route.toPath(urlParams))
  }

  /**
   * To be called from a lazy component's onLoad event
   *
   * 1. Restore the scroll position after a route change
   */
  public onLoad = () => {
    const _scrollTo = () => !navigator.userAgent.includes('jsdom') && scrollTo(0, this.scrollNext)
    setTimeout(_scrollTo)
    setTimeout(_scrollTo, 100)
    setTimeout(_scrollTo, 200)
    setTimeout(_scrollTo, 300)
  }

  /** Navigate to a route by replaceState */
  public replace = (routeOrKey: Route | string, urlParams: Record<string, string> = {}) => {
    const route = typeof routeOrKey === 'string' ? this.routes[routeOrKey] : routeOrKey
    history.replaceState(Date.now(), '', route.toPath(urlParams))
  }

  /** Subscribe to changes to the route */
  public subscribe = (fn: (route: RouteMatch) => any) => {
    this.subscribers.push(fn)
    return () => this.unsubscribe(fn)
  }

  /** Unsubscribe to changes to the route */
  public unsubscribe = (fn: (route: RouteMatch) => any) => {
    this.subscribers = this.subscribers.filter(l => l !== fn)
  }

  /**
   * Intercept history.pushState, history.replaceState, and click events
   */
  private hookHistory = () => {
    const pushStateOrig = history.pushState.bind(history)
    const replaceStateOrig = history.replaceState.bind(history)

    history.pushState = (date, unused, url) => {
      let urlObj = toUrlObj(url as any)

      if (urlObj.hash === '#replace') {
        return history.replaceState(date, unused, urlObj)
      }

      if (urlObj.origin !== location.origin) {
        return pushStateOrig(date, unused, urlObj)
      }

      this.scrollNext = 0
      let next = this.find(urlObj)

      if (next.isStack && next.stackHistory?.length) {
        if (this.current.route.stack?.key === next.key) {
          next.stackHistory = []
        } else {
          const recall = next.stackHistory.at(-1)!
          urlObj = new URL(recall.url)
          this.scrollNext = recall.scrollTop
          next = this.find(urlObj)
        }
      }

      this.current.route.stack?.stackHistory?.push({
        url: location.href,
        scrollTop: window.scrollY,
      })
      this.history.push(this.current)

      this.subscribers.forEach(fn => fn(next))
      pushStateOrig(date, unused, urlObj)
    }
    history.replaceState = (date, unused, url) => {
      const urlObj = toUrlObj(url as any)
      this.subscribers.forEach(fn => fn(this.find(urlObj)))
      replaceStateOrig(date, unused, urlObj)
    }

    addEventListener('popstate', () => {
      this.previous?.route.stack?.stackHistory?.pop()
      this.scrollNext = this.previous?.scrollTop || 0
      this.history.pop()
      this.subscribers.forEach(fn => fn(this.find(new URL(location.href))))
    })

    /**
     * intercept anchor tag clicks
     */
    addEventListener('click', (e: any) => {
      const ln = findLinkTagInParents(e.target) // aka linkNode
      if (ln) {
        e.preventDefault()
        history.pushState(Date.now(), '', ln.href)
      }
    })
  }

  /** Returns an object of URL params if path matches route.path, false otherwise */
  static isMatch = (path: string, pathMask: string, exact = true) => {
    const argRx = /:([^/]*)/g
    const urlRx = '^' + pathMask.replace(argRx, '([^/]*)') + (exact ? '$' : '')
    const match = [...path.matchAll(new RegExp(urlRx, 'gi'))]?.[0]
    const urlParams = match
      ? [...pathMask.matchAll(argRx)].reduce(
          (acc, arg, i) => ({...acc, [arg[1]]: match[i + 1]}),
          {}
        )
      : false
    return urlParams
  }
}
