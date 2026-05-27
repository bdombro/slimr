import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useReRender } from "./useReRender.js"

describe("useReRender", () => {
	it("returns a function", () => {
		const { result } = renderHook(() => useReRender())
		expect(typeof result.current).toBe("function")
	})

	it("returns a stable reference across renders", () => {
		const { result, rerender } = renderHook(() => useReRender())
		const first = result.current
		rerender()
		expect(result.current).toBe(first)
	})

	it("triggers a re-render when called", () => {
		let renderCount = 0
		const { result } = renderHook(() => {
			renderCount++
			return useReRender()
		})
		const before = renderCount
		act(() => {
			result.current()
		})
		expect(renderCount).toBeGreaterThan(before)
	})
})
