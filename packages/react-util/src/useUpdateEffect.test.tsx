import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useUpdateEffect } from "./useUpdateEffect.js"

describe("useUpdateEffect", () => {
	it("does not run the effect on mount", () => {
		const fn = vi.fn()
		renderHook(() => useUpdateEffect(fn, []))
		expect(fn).not.toHaveBeenCalled()
	})

	it("runs the effect when deps change", () => {
		const fn = vi.fn()
		const { rerender } = renderHook(({ dep }: { dep: number }) => useUpdateEffect(fn, [dep]), {
			initialProps: { dep: 1 },
		})
		expect(fn).not.toHaveBeenCalled()

		rerender({ dep: 2 })
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("does not re-run when deps are unchanged", () => {
		const fn = vi.fn()
		const { rerender } = renderHook(({ dep }: { dep: number }) => useUpdateEffect(fn, [dep]), {
			initialProps: { dep: 1 },
		})
		rerender({ dep: 1 })
		expect(fn).not.toHaveBeenCalled()
	})

	it("calls the cleanup function on re-render", () => {
		const cleanup = vi.fn()
		const fn = vi.fn(() => cleanup)
		const { rerender } = renderHook(({ dep }: { dep: number }) => useUpdateEffect(fn, [dep]), {
			initialProps: { dep: 1 },
		})
		rerender({ dep: 2 })
		expect(fn).toHaveBeenCalledTimes(1)

		rerender({ dep: 3 })
		expect(cleanup).toHaveBeenCalledTimes(1)
	})
})
