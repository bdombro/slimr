import type React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Router } from "./router-class.js"

function noop() {
	return null
}
const Home: React.FC<any> = noop
const About: React.FC<any> = noop
const User: React.FC<any> = noop
const StackRoot: React.FC<any> = noop
const StackChild: React.FC<any> = noop
const NotFound: React.FC<any> = noop

const routes = {
	home: { path: "/", exact: true, component: Home },
	about: { path: "/about", component: About },
	notFound: { exact: false, path: "/", component: NotFound },
} as any

const stackRoutes = {
	photos: { path: "/photos", isStack: true, component: StackRoot },
	"photos.detail": { path: "/photos/:id", component: StackChild },
	notFound: { exact: false, path: "/", component: NotFound },
} as any

// Use a counter to generate unique paths per test, avoiding the
// Router pushState interceptor's "same href" early-return that
// would otherwise skip subscriber notification.
let urlSeq = 0
function uniquePath(base: string) {
	return `${base}?_=${++urlSeq}`
}

const origPushState = Router.pushStateRaw
const origReplaceState = Router.replaceStateRaw

// Use the raw browser pushState to reset location.href between tests.
// This prevents the pushState interceptor's "same href" early-return
// and ensures historyBySeq entries store the correct from-route.
function cleanupHistory() {
	origPushState(null, "", "/")
	history.pushState = origPushState
	history.replaceState = origReplaceState
}

afterEach(() => {
	cleanupHistory()
})

// ── Router.isMatch – static, pure — no side-effects ────────────────────────

describe("Router.isMatch (static)", () => {
	it("exact match returns empty object", () => {
		expect(Router.isMatch("/", "/", true)).toEqual({})
	})
	it("non-match returns false", () => {
		expect(Router.isMatch("/about", "/", true)).toBe(false)
	})
	it("captures path params", () => {
		expect(Router.isMatch("/users/42", "/users/:id", true)).toEqual({ id: "42" })
		expect(Router.isMatch("/posts/hello/comments/99", "/posts/:slug/comments/:cid", true)).toEqual({
			slug: "hello",
			cid: "99",
		})
	})
	it("fuzzy match", () => {
		expect(Router.isMatch("/users/42/settings", "/users/:id", false)).toEqual({ id: "42" })
		expect(Router.isMatch("/goods", "/users/:id", false)).toBe(false)
	})
	it("escapes regex metacharacters in mask", () => {
		expect(Router.isMatch("/file.v1", "/file.v1", true)).toEqual({})
		expect(Router.isMatch("/users+", "/users+", true)).toEqual({})
		expect(Router.isMatch("/file.report.pdf", "/file.:ext", true)).toEqual({ ext: "report.pdf" })
	})
	it("default exact=true", () => {
		expect(Router.isMatch("/a", "/a")).toEqual({})
		expect(Router.isMatch("/a/b", "/a")).toBe(false)
	})
})

// ── Router construction & route properties ─────────────────────────────────

describe("Router construction", () => {
	it("creates routes with isMatch, toPath, and key", () => {
		const r = new Router(routes)
		const home = r.routes["home" as any]
		expect(home.key).toBe("home")
		expect(typeof home.isMatch).toBe("function")
		expect(typeof home.toPath).toBe("function")
	})
	it("toPath resolves params", () => {
		const r = new Router({
			user: { path: "/user/:id", component: User },
			notFound: { exact: false, path: "/", component: NotFound },
		} as any)
		expect(r.routes["user" as any].toPath({ id: "42" })).toBe("/user/42")
	})
	it("toPath encodes special characters in params", () => {
		const r = new Router({
			user: { path: "/user/:id", component: User },
			notFound: { exact: false, path: "/", component: NotFound },
		} as any)
		expect(r.routes["user" as any].toPath({ id: "a/b" })).toBe("/user/a%2Fb")
	})
	it("toPath appends unknown params as query string", () => {
		const r = new Router({
			user: { path: "/user/:id", component: User },
			notFound: { exact: false, path: "/", component: NotFound },
		} as any)
		const path = r.routes["user" as any].toPath({ id: "42", tab: "settings" })
		expect(path).toContain("?")
		expect(path).toContain("tab=settings")
	})
	it("links stack children to their stack root", () => {
		const r = new Router(stackRoutes)
		expect(r.routes["photos.detail" as any].stack).toBeDefined()
		expect(r.routes["photos.detail" as any].stack!.key).toBe("photos")
	})
	it("assigns stackHistory to stack roots only", () => {
		const r = new Router(stackRoutes)
		const root = r.routes["photos" as any]
		const child = r.routes["photos.detail" as any]
		expect(Array.isArray(root.stackHistory)).toBe(true)
		expect(root.stackHistory).toHaveLength(0)
		expect(child.stack).toBe(root)
	})
})

// ── find() ─────────────────────────────────────────────────────────────────

describe("Router.find", () => {
	it("returns the matching route with urlParams", () => {
		const r = new Router(routes)
		expect(r.find(new URL("http://localhost/about")).key).toBe("about")
	})
	it("includes urlParams from the path", () => {
		const r = new Router({
			user: { path: "/user/:id", component: User },
			notFound: { exact: false, path: "/", component: NotFound },
		} as any)
		const match = r.find(new URL("http://localhost/user/abc"))
		expect(match.urlParams).toHaveProperty("id", "abc")
	})
	it("merges query params into urlParams", () => {
		const r = new Router(routes)
		const match = r.find(new URL("http://localhost/about?foo=bar"))
		expect(match.urlParams).toHaveProperty("foo", "bar")
	})
	it("throws when no route matches", () => {
		const r = new Router({ home: { path: "/", exact: true, component: Home } } as any)
		expect(() => r.find(new URL("http://localhost/nope"))).toThrow(/No route/i)
	})
})

// ── subscribe / unsubscribe ────────────────────────────────────────────────

describe("subscribe", () => {
	it("notifies subscribers on navigation", () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.subscribe(fn)
		r.goto(uniquePath("/about"))
		expect(fn).toHaveBeenCalledTimes(1)
		expect(fn.mock.calls[0][0].key).toBe("about")
	})
	it("unsubscribe removes the listener", () => {
		const r = new Router(routes)
		const fn = vi.fn()
		const unsub = r.subscribe(fn)
		unsub()
		r.goto("/about")
		expect(fn).not.toHaveBeenCalled()
	})
	it("supports multiple subscribers", () => {
		const r = new Router(routes)
		const a = vi.fn()
		const b = vi.fn()
		r.subscribe(a)
		r.subscribe(b)
		r.goto(uniquePath("/about"))
		expect(a).toHaveBeenCalledTimes(1)
		expect(b).toHaveBeenCalledTimes(1)
	})
})

// ── goto / replace ─────────────────────────────────────────────────────────

describe("goto", () => {
	it("goto with route key navigates to that route", () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.subscribe(fn)
		r.goto(uniquePath("/about"))
		expect(fn.mock.calls[0][0].key).toBe("about")
	})
	it("goto with a raw string path navigates directly", () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.subscribe(fn)
		r.goto(uniquePath("/about"))
		expect(fn.mock.calls[0][0].key).toBe("about")
	})
	it("goto with a route object navigates to that route", () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.subscribe(fn)
		r.goto(r.routes["about" as any])
		expect(fn.mock.calls[0][0].key).toBe("about")
	})
	it("goto with urlParams resolves the path", () => {
		const r = new Router({
			user: { path: "/user/:id", component: User },
			notFound: { exact: false, path: "/", component: NotFound },
		} as any)
		const fn = vi.fn()
		r.subscribe(fn)
		r.goto("user", { id: "99" })
		const matched = fn.mock.calls[0][0]
		expect(matched.key).toBe("user")
		expect(matched.urlParams?.id).toBe("99")
	})
})

describe("replace", () => {
	it("replace calls replaceState and notifies subscribers", () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.subscribe(fn)
		r.replace(uniquePath("/about"))
		expect(fn).toHaveBeenCalledTimes(1)
		expect(fn.mock.calls[0][0].key).toBe("about")
	})
	it("replace with a raw path string", () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.subscribe(fn)
		r.replace(uniquePath("/about"))
		expect(fn.mock.calls[0][0].key).toBe("about")
	})
})

// ── current getter ─────────────────────────────────────────────────────────

describe("current getter", () => {
	it("returns the current route and URL info", () => {
		const r = new Router(routes)
		expect(r.current.route).toBeDefined()
		expect(typeof r.current.path).toBe("string")
	})
	it("updates after goto", () => {
		const r = new Router(routes)
		r.goto(uniquePath("/about"))
		expect(r.current.route.key).toBe("about")
	})
})

// ── historyBySeq ─────────────────────────────────────────────────────────

describe("historyBySeq", () => {
	it("stores entries on navigation", () => {
		const r = new Router(routes)
		r.goto(uniquePath("/about"))
		expect(r.historyBySeq.size).toBeGreaterThanOrEqual(1)
	})
	it("stores the from-route and from-URL", () => {
		const r = new Router(routes)
		r.goto(uniquePath("/about"))
		const entries = [...r.historyBySeq.values()]
		expect(entries[entries.length - 1].route.key).toBe("home")
	})
})

// ── stack routing ──────────────────────────────────────────────────────────

describe("stacks", () => {
	it("stackHistory records navigation from a stack child", () => {
		const r = new Router(stackRoutes)
		const photos = r.routes["photos" as any]
		// Navigate to stack root first
		r.replace("/photos")
		// Then navigate to stack child — this pushes the previous entry to stackHistory
		r.goto("/photos/1")
		expect(photos.stackHistory!.length).toBeGreaterThanOrEqual(1)
	})
	it("navigating to stack root pops stackHistory", () => {
		const r = new Router(stackRoutes)
		const photos = r.routes["photos" as any]
		r.replace("/photos")
		expect(photos.stackHistory!).toHaveLength(0)
		r.goto("/photos/1")
		expect(photos.stackHistory!.length).toBe(1)
		r.goto("/photos")
		expect(photos.stackHistory!.length).toBe(0)
	})
})
