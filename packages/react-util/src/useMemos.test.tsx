import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useDeepCompareMemo, useShallowCompareMemo } from "./useMemos.js"

describe("useDeepCompareMemo", () => {
	it("memoizes across renders with same deeply-equal deps", () => {
		const fn = vi.fn((x: number) => x * 2)
		const { rerender } = renderHook(
			({ deps }: { deps: [number] }) => useDeepCompareMemo(() => fn(deps[0]), deps),
			{ initialProps: { deps: [1] } },
		)
		expect(fn).toHaveBeenCalledTimes(1)

		rerender({ deps: [1] })
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("re-computes when deps deeply change", () => {
		const fn = vi.fn((x: number) => x * 2)
		const { rerender } = renderHook(
			({ deps }: { deps: [number] }) => useDeepCompareMemo(() => fn(deps[0]), deps),
			{ initialProps: { deps: [1] } },
		)
		expect(fn).toHaveBeenCalledTimes(1)

		rerender({ deps: [2] })
		expect(fn).toHaveBeenCalledTimes(2)
	})
})

describe("useShallowCompareMemo", () => {
	it("memoizes across renders with same shallowly-equal deps", () => {
		const fn = vi.fn((x: number) => x * 2)
		const { rerender } = renderHook(
			({ deps }: { deps: [number] }) => useShallowCompareMemo(() => fn(deps[0]), deps),
			{ initialProps: { deps: [1] } },
		)
		expect(fn).toHaveBeenCalledTimes(1)

		rerender({ deps: [1] })
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("re-computes when deps shallowly change", () => {
		const fn = vi.fn((x: number) => x * 2)
		const { rerender } = renderHook(
			({ deps }: { deps: [number] }) => useShallowCompareMemo(() => fn(deps[0]), deps),
			{ initialProps: { deps: [1] } },
		)
		expect(fn).toHaveBeenCalledTimes(1)

		rerender({ deps: [2] })
		expect(fn).toHaveBeenCalledTimes(2)
	})
})
