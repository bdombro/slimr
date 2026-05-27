import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSet } from "./useSet.js"

describe("useSet", () => {
	it("returns a set-like object", () => {
		const { result } = renderHook(() => useSet(new Set([1, 2, 3])))
		expect(result.current.has(1)).toBe(true)
		expect(result.current.has(4)).toBe(false)
		expect(result.current.size).toBe(3)
	})

	it("add triggers re-render", () => {
		let renderCount = 0
		const { result } = renderHook(() => {
			renderCount++
			return useSet(new Set<number>())
		})
		const before = renderCount
		act(() => {
			result.current.add(1)
		})
		expect(renderCount).toBeGreaterThan(before)
		expect(result.current.has(1)).toBe(true)
	})

	it("delete triggers re-render", () => {
		let renderCount = 0
		const { result } = renderHook(() => {
			renderCount++
			return useSet(new Set([1, 2, 3]))
		})
		const before = renderCount
		act(() => {
			result.current.delete(1)
		})
		expect(renderCount).toBeGreaterThan(before)
		expect(result.current.has(1)).toBe(false)
	})

	it("clear triggers re-render", () => {
		let renderCount = 0
		const { result } = renderHook(() => {
			renderCount++
			return useSet(new Set([1, 2, 3]))
		})
		const before = renderCount
		act(() => {
			result.current.clear()
		})
		expect(renderCount).toBeGreaterThan(before)
		expect(result.current.size).toBe(0)
	})

	it("toggle adds an absent value", () => {
		const { result } = renderHook(() => useSet(new Set([1])))
		act(() => {
			result.current.toggle(2)
		})
		expect(result.current.has(2)).toBe(true)
	})

	it("toggle removes a present value", () => {
		const { result } = renderHook(() => useSet(new Set([1, 2])))
		act(() => {
			result.current.toggle(1)
		})
		expect(result.current.has(1)).toBe(false)
	})

	it("reset restores to initial", () => {
		const { result } = renderHook(() => useSet(new Set([1, 2, 3])))
		act(() => {
			result.current.add(4)
			result.current.delete(2)
		})
		act(() => {
			result.current.reset()
		})
		expect(result.current.has(1)).toBe(true)
		expect(result.current.has(2)).toBe(true)
		expect(result.current.has(3)).toBe(true)
		expect(result.current.has(4)).toBe(false)
	})

	it("union adds elements from another set", () => {
		const { result } = renderHook(() => useSet(new Set([1, 2])))
		act(() => {
			result.current.union(new Set([2, 3, 4]))
		})
		expect(result.current.has(1)).toBe(true)
		expect(result.current.has(2)).toBe(true)
		expect(result.current.has(3)).toBe(true)
		expect(result.current.has(4)).toBe(true)
	})

	it("uses an empty set by default", () => {
		const { result } = renderHook(() => useSet())
		expect(result.current.size).toBe(0)
	})
})
