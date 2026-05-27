import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useColorScheme } from "./useColorScheme.js"

describe("useColorScheme", () => {
	it("returns light mode when prefers-color-scheme is not dark", () => {
		globalThis.matchMedia = vi.fn().mockImplementation(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}))

		const { result } = renderHook(() => useColorScheme())
		expect(result.current).toEqual({ dark: false, light: true, scheme: "light" })
	})

	it("returns dark mode when prefers-color-scheme is dark", () => {
		globalThis.matchMedia = vi.fn().mockImplementation(() => ({
			matches: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}))

		const { result } = renderHook(() => useColorScheme())
		expect(result.current).toEqual({ dark: true, light: false, scheme: "dark" })
	})

	it("updates on matchMedia change", () => {
		const listeners: Record<string, () => void> = {}
		globalThis.matchMedia = vi.fn().mockImplementation(() => {
			let matches = false
			return {
				get matches() {
					return matches
				},
				addEventListener: vi.fn((event: string, handler: () => void) => {
					listeners[event] = () => {
						matches = !matches
						handler()
					}
				}),
				removeEventListener: vi.fn(),
			}
		})

		const { result } = renderHook(() => useColorScheme())
		expect(result.current).toEqual({ dark: false, light: true, scheme: "light" })

		act(() => {
			listeners.change?.()
		})
		expect(result.current).toEqual({ dark: true, light: false, scheme: "dark" })
	})
})
