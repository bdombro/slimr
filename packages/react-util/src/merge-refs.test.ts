import type React from "react"
import { describe, expect, it, vi } from "vitest"
import { mergeRefs } from "./merge-refs.js"

describe("mergeRefs", () => {
	it("calls callback refs with the value", () => {
		const ref = vi.fn()
		const merged = mergeRefs([ref])
		merged("value")
		expect(ref).toHaveBeenCalledWith("value")
	})

	it("assigns to mutable refs", () => {
		const ref: React.MutableRefObject<string | null> = { current: null }
		const merged = mergeRefs([ref])
		merged("value")
		expect(ref.current).toBe("value")
	})

	it("handles a mix of callback and mutable refs", () => {
		const callback = vi.fn()
		const mutable: React.MutableRefObject<string | null> = { current: null }
		const merged = mergeRefs([callback, mutable])
		merged("value")
		expect(callback).toHaveBeenCalledWith("value")
		expect(mutable.current).toBe("value")
	})

	it("skips null refs", () => {
		const ref = vi.fn()
		const merged = mergeRefs([null, ref])
		merged("value")
		expect(ref).toHaveBeenCalledWith("value")
	})

	it("returns a stable ref callback", () => {
		const ref = vi.fn()
		const merged = mergeRefs([ref])
		merged("a")
		merged("b")
		expect(ref).toHaveBeenCalledTimes(2)
		expect(ref).toHaveBeenCalledWith("a")
		expect(ref).toHaveBeenCalledWith("b")
	})
})
