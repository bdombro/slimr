/**
 * @vitest-environment jsdom
 */
import { Observable } from "@slimr/observable"
import { renderHook } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { LocalAdapter } from "../adapters/LocalAdapter.js"
import { installIndexedDbTestShim } from "../test-support/indexeddb.js"
import { DbSyncR } from "./DbSyncReact.js"
import { wrapObservable } from "./ObservableReact.js"
import { useDbQuery } from "./useDbQuery.js"

beforeAll(() => {
	installIndexedDbTestShim()
})

describe("ObservableReact", () => {
	it("subscribe forwards select to the inner observable", () => {
		const inner = new Observable("test", { n: 1 })
		const wrapped = wrapObservable(inner)
		const listener = vi.fn()

		wrapped.subscribe(listener, (v) => v.n)
		expect(listener).not.toHaveBeenCalled()

		inner.set({ n: 1 })
		expect(listener).not.toHaveBeenCalled()

		inner.set({ n: 2 })
		expect(listener).toHaveBeenCalledWith(2)
	})

	it("delegates subscribe, val, and set", () => {
		const inner = new Observable("test", 1)
		const wrapped = wrapObservable(inner)

		expect(wrapped.name).toBe("test")
		expect(wrapped.val).toBe(1)

		const listener = vi.fn()
		const unsubscribe = wrapped.subscribe(listener)

		wrapped.set(2)
		expect(inner.val).toBe(2)
		expect(wrapped.val).toBe(2)
		expect(listener).toHaveBeenCalledWith(2)

		inner.set(3)
		expect(wrapped.val).toBe(3)
		expect(listener).toHaveBeenCalledWith(3)

		unsubscribe()
		inner.set(4)
		expect(listener).not.toHaveBeenCalledWith(4)
	})

	it("caches wrapper instances", () => {
		const inner = new Observable("test", 1)
		const wrapped1 = wrapObservable(inner)
		const wrapped2 = wrapObservable(inner)
		expect(wrapped1).toBe(wrapped2)
	})

	it("supports .use() hook", () => {
		const inner = new Observable("test", 1)
		const wrapped = wrapObservable(inner)

		const { result, rerender } = renderHook(() => wrapped.use())
		expect(result.current).toBe(1)

		wrapped.set(2)
		rerender()
		expect(result.current).toBe(2)
	})
})

describe("DbSyncReact", () => {
	it("wraps observables on new DbSyncR", () => {
		const db = new DbSyncR({ adapter: new LocalAdapter() })

		expect(db.auth.phase$.val).toBe("logged-out")

		const { result, rerender } = renderHook(() => db.auth.phase$.use())
		expect(result.current).toBe("logged-out")

		expect(db.auth).toBe(db.auth)
		expect(db.auth.phase$).toBe(db.auth.phase$)
	})

	it("preserves subclass methods and properties", () => {
		class AppDb extends DbSyncR {
			get myCustomProp() {
				return "custom"
			}
		}

		const db = new AppDb({ adapter: new LocalAdapter() })

		expect(db.myCustomProp).toBe("custom")
		expect(db.auth.phase$.name).toContain("-phase")
	})

	it("works with useDbQuery", () => {
		const db = new DbSyncR({ adapter: new LocalAdapter() })
		const { result } = renderHook(() =>
			useDbQuery(db, "test", () => Promise.resolve([{ id: "1" }])),
		)
		expect(result.current.value).toBeNull()
	})
})
