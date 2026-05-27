import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useMedia } from "./useMedia.js"

describe("useMedia", () => {
	it("returns true for a matching query", () => {
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(max-width: 768px)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}))

		const { result } = renderHook(() => useMedia("(max-width: 768px)"))
		expect(result.current).toBe(true)
	})

	it("returns false for a non-matching query", () => {
		window.matchMedia = vi.fn().mockImplementation(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}))

		const { result } = renderHook(() => useMedia("(min-width: 2000px)"))
		expect(result.current).toBe(false)
	})

	it("updates when the media query changes", () => {
		const listeners: Record<string, (e: { matches: boolean }) => void> = {}
		window.matchMedia = vi.fn().mockImplementation(() => ({
			matches: true,
			addEventListener: vi.fn((event: string, handler: (e: { matches: boolean }) => void) => {
				listeners[event] = handler
			}),
			removeEventListener: vi.fn(),
		}))

		const { result } = renderHook(() => useMedia("(max-width: 768px)"))
		expect(result.current).toBe(true)

		act(() => {
			listeners.change?.({ matches: false })
		})
	})
})
