import { describe, expect, test, vi } from "vitest"
import { Observable } from "./Observable.js"

describe("Observable", () => {
	test("notifies subscribers when val changes", async () => {
		const o = new Observable("t-val", 0)
		const fn = vi.fn()
		o.subscribe(fn)
		o.val = 1
		await vi.waitFor(() => expect(fn).toHaveBeenCalledWith(1))
	})

	test("set with functional updater", async () => {
		const o = new Observable("t-set-fn", 1)
		const fn = vi.fn()
		o.subscribe(fn)
		await o.set((n) => n + 1)
		expect(fn).toHaveBeenCalledWith(2)
	})

	test("skips publish when deep-equal value unchanged", async () => {
		const o = new Observable("t-deep", { a: 1 })
		const fn = vi.fn()
		o.subscribe(fn)
		await o.set({ a: 1 })
		expect(fn).not.toHaveBeenCalled()
	})

	test("unsubscribe stops notifications", async () => {
		const o = new Observable("t-unsub", 0)
		const fn = vi.fn()
		const off = o.subscribe(fn)
		off()
		o.val = 1
		await Promise.resolve()
		expect(fn).not.toHaveBeenCalled()
	})

	test("registers on globalThis.observables", () => {
		const o = new Observable("debug-reg", 0)
		// @ts-expect-error
		expect(globalThis.observables["debug-reg"]).toBe(o)
	})

	test("subscribe with select notifies only when slice changes", async () => {
		const o = new Observable("t-select", { bar: 2, man: 3 })
		const fn = vi.fn()
		o.subscribe(fn, (s) => s.man)
		await o.set((s) => ({ ...s, man: 4 }))
		expect(fn).toHaveBeenCalledOnce()
		expect(fn).toHaveBeenCalledWith(4)
		fn.mockClear()
		await o.set((s) => ({ ...s, bar: 99 }))
		expect(fn).not.toHaveBeenCalled()
	})

	test("subscribe with select passes slice not full value", async () => {
		const o = new Observable("t-select-slice", { bar: 1, man: 2 })
		const fn = vi.fn()
		o.subscribe(fn, (s) => s.man)
		await o.set((s) => ({ ...s, man: 5 }))
		expect(fn).toHaveBeenCalledWith(5)
	})
})
