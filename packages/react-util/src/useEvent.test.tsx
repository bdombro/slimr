import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useEvent } from "./useEvent.js"

describe("useEvent", () => {
	it("calls the handler when the event fires on window", () => {
		const handler = { current: vi.fn() }
		renderHook(() => useEvent("click", handler.current))

		act(() => {
			window.dispatchEvent(new MouseEvent("click"))
		})
		expect(handler.current).toHaveBeenCalledTimes(1)
	})

	it("removes the listener on unmount", () => {
		const handler = vi.fn()
		const { unmount } = renderHook(() => useEvent("click", handler))

		unmount()

		act(() => {
			window.dispatchEvent(new MouseEvent("click"))
		})
		expect(handler).not.toHaveBeenCalled()
	})

	it("re-registers when the handler changes", () => {
		const handler1 = vi.fn()
		const handler2 = vi.fn()
		const { rerender } = renderHook(
			({ handler }: { handler: (e: Event) => void }) => useEvent("click", handler),
			{ initialProps: { handler: handler1 } },
		)

		rerender({ handler: handler2 })

		act(() => {
			window.dispatchEvent(new MouseEvent("click"))
		})
		expect(handler1).not.toHaveBeenCalled()
		expect(handler2).toHaveBeenCalledTimes(1)
	})
})
