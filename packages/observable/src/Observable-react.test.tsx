import { act, cleanup, render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, test, vi } from "vitest"
import { Observable } from "./Observable.js"
import { ObservableR, useLocalObservable, useObservable } from "./Observable-react.js"

afterEach(() => cleanup())

describe("useObservable", () => {
	test("re-renders when source val changes", async () => {
		const o = new Observable("react-sub", 0)

		function Reader() {
			const v = useObservable(o)
			return <div data-testid="v">{v}</div>
		}

		render(<Reader />)
		expect(screen.getByTestId("v").textContent).toBe("0")

		await act(async () => {
			o.val = 2
		})
		expect(screen.getByTestId("v").textContent).toBe("2")
	})

	test("unsubscribes on unmount", () => {
		const o = new Observable("react-unsub", 0)
		let unsubscribeCalls = 0
		const origSubscribe = o.subscribe.bind(o)
		vi.spyOn(o, "subscribe").mockImplementation((cb) => {
			const off = origSubscribe(cb)
			return () => {
				unsubscribeCalls++
				off()
			}
		})

		const { unmount } = render(<Reader o={o} />)
		expect(o.subscribe).toHaveBeenCalledOnce()
		unmount()
		expect(unsubscribeCalls).toBe(1)
	})

	test("does not re-render when set is deep-equal noop", async () => {
		const o = new Observable("react-noop", { a: 1 })
		let renderCount = 0

		function Reader() {
			renderCount++
			useObservable(o)
			return null
		}

		render(<Reader />)
		const afterMount = renderCount

		await act(async () => {
			await o.set({ a: 1 })
		})
		expect(renderCount).toBe(afterMount)
	})

	test("getServerSnapshot option is used for SSR", () => {
		const o = new Observable("react-ssr", 5)

		function Reader() {
			const v = useObservable(o, { getServerSnapshot: () => 99 })
			return <div>{v}</div>
		}

		expect(renderToString(<Reader />)).toContain("99")
	})

	test("select option re-renders only when slice changes", async () => {
		const o = new Observable("react-select", { bar: 0, man: 1 })
		let renderCount = 0

		function Reader() {
			renderCount++
			const man = useObservable(o, { select: (s) => s.man })
			return <div data-testid="man">{man}</div>
		}

		render(<Reader />)
		expect(screen.getByTestId("man").textContent).toBe("1")
		const afterMount = renderCount

		await act(async () => {
			await o.set((s) => ({ ...s, bar: 99 }))
		})
		expect(renderCount).toBe(afterMount)
		expect(screen.getByTestId("man").textContent).toBe("1")

		await act(async () => {
			await o.set((s) => ({ ...s, man: 2 }))
		})
		expect(renderCount).toBe(afterMount + 1)
		expect(screen.getByTestId("man").textContent).toBe("2")
	})
})

describe("ObservableR", () => {
	test("use() re-renders and returns current val", async () => {
		const o = new ObservableR("react-r-use", 0)

		function Reader() {
			const v = o.use()
			return <div data-testid="v">{v}</div>
		}

		render(<Reader />)
		expect(screen.getByTestId("v").textContent).toBe("0")

		await act(async () => {
			o.val = 3
		})
		expect(screen.getByTestId("v").textContent).toBe("3")
	})
})

describe("useLocalObservable", () => {
	test("re-renders when handle.value changes", async () => {
		function Counter() {
			const count = useLocalObservable(0)
			return (
				<button type="button" onClick={() => count.value++}>
					{count.value}
				</button>
			)
		}

		render(<Counter />)
		const btn = screen.getByRole("button")
		expect(btn.textContent).toBe("0")

		await act(async () => {
			btn.click()
		})
		expect(btn.textContent).toBe("1")
	})
})

function Reader({ o }: { o: Observable<number> }) {
	const v = useObservable(o)
	return <div data-testid="v">{v}</div>
}
