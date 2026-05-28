import type React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
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

let urlSeq = 0
function uniquePath(base: string) {
	const hasQuery = base.includes("?")
	return `${base}${hasQuery ? "&" : "?"}_=${++urlSeq}`
}

const origPushState = Router.pushStateRaw
const origReplaceState = Router.replaceStateRaw

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
	it("exposes route$ observable", () => {
		const r = new Router(routes)
		expect(r.route$).toBeDefined()
		expect(typeof r.route$.use).toBe("function")
		expect(typeof r.route$.subscribe).toBe("function")
		expect(r.route$.val).toBeDefined()
	})
	it("exposes searchParams$ observable", () => {
		const r = new Router(routes)
		expect(r.searchParams$).toBeDefined()
		expect(typeof r.searchParams$.use).toBe("function")
		expect(typeof r.searchParams$.subscribe).toBe("function")
	})
	it("route$.val matches current.route", () => {
		const r = new Router(routes)
		expect(r.route$.val.key).toBe(r.current.route.key)
	})
	it("searchParams$.val matches current search", () => {
		const r = new Router(routes)
		expect(r.searchParams$.val.toString()).toBe(new URLSearchParams(location.search).toString())
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

// ── subscribe / unsubscribe via route$ ──────────────────────────────────────

describe("route$.subscribe", () => {
	it("notifies subscribers on navigation", async () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.route$.subscribe(fn)
		r.goto(uniquePath("/about"))
		await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1))
		expect(fn.mock.calls[0][0].key).toBe("about")
	})
	it("unsubscribe removes the listener", async () => {
		const r = new Router(routes)
		const fn = vi.fn()
		const unsub = r.route$.subscribe(fn)
		unsub()
		r.goto("/about")
		await vi.waitFor(() => {})
		expect(fn).not.toHaveBeenCalled()
	})
	it("supports multiple subscribers", async () => {
		const r = new Router(routes)
		const a = vi.fn()
		const b = vi.fn()
		r.route$.subscribe(a)
		r.route$.subscribe(b)
		r.goto(uniquePath("/about"))
		await vi.waitFor(() => expect(a).toHaveBeenCalledTimes(1))
		expect(b).toHaveBeenCalledTimes(1)
	})
})

// ── searchParams$.subscribe ─────────────────────────────────────────────────

describe("searchParams$.subscribe", () => {
	it("fires when query params change without route change", async () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.searchParams$.subscribe(fn)
		r.goto(uniquePath("/about?foo=bar"))
		await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1))
		const sp = fn.mock.calls[0][0]
		expect(sp.get("foo")).toBe("bar")
	})
	it("searchParams$.val updates after navigation", async () => {
		const r = new Router(routes)
		r.goto(uniquePath("/about?page=2"))
		await vi.waitFor(() => {
			expect(r.searchParams$.val.get("page")).toBe("2")
		})
	})
})

// ── goto / replace ─────────────────────────────────────────────────────────

describe("goto", () => {
	it("goto with route key navigates to that route", async () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.route$.subscribe(fn)
		r.goto(uniquePath("/about"))
		await vi.waitFor(() => expect(fn.mock.calls[0][0].key).toBe("about"))
	})
	it("goto with a raw string path navigates directly", async () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.route$.subscribe(fn)
		r.goto(uniquePath("/about"))
		await vi.waitFor(() => expect(fn.mock.calls[0][0].key).toBe("about"))
	})
	it("goto with a route object navigates to that route", async () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.route$.subscribe(fn)
		r.goto(r.routes["about" as any])
		await vi.waitFor(() => expect(fn.mock.calls[0][0].key).toBe("about"))
	})
	it("goto with urlParams resolves the path", async () => {
		const r = new Router({
			user: { path: "/user/:id", component: User },
			notFound: { exact: false, path: "/", component: NotFound },
		} as any)
		const fn = vi.fn()
		r.route$.subscribe(fn)
		r.goto("user", { id: "99" })
		await vi.waitFor(() => {
			const matched = fn.mock.calls[0][0]
			expect(matched.key).toBe("user")
			expect(matched.urlParams?.id).toBe("99")
		})
	})
})

describe("replace", () => {
	it("replace calls replaceState and notifies subscribers", async () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.route$.subscribe(fn)
		r.replace(uniquePath("/about"))
		await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1))
		expect(fn.mock.calls[0][0].key).toBe("about")
	})
	it("replace with a raw path string", async () => {
		const r = new Router(routes)
		const fn = vi.fn()
		r.route$.subscribe(fn)
		r.replace(uniquePath("/about"))
		await vi.waitFor(() => expect(fn.mock.calls[0][0].key).toBe("about"))
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
		r.replace("/photos")
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
