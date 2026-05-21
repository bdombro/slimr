import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useDbSession } from "./useDbSession.js"

afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

describe("useDbSession", () => {
	test("reflects session and boot state from db", async () => {
		const listeners = new Set<() => void>()
		const auth = {
			isLoggedIn: true,
			isBootstrapping: false,
			onSessionChange: (listener: () => void) => {
				listeners.add(listener)
				return { close: () => listeners.delete(listener) }
			},
		}
		const db = {
			auth,
			isBooted: true,
			isReady: true,
			offline: false,
			online: true,
		}

		function SessionView() {
			const session = useDbSession(db as never)
			return (
				<div>
					<span data-testid="logged-in">{String(session.isLoggedIn)}</span>
					<span data-testid="db-ready">{String(session.isReady)}</span>
					<span data-testid="offline">{String(session.offline)}</span>
				</div>
			)
		}

		render(<SessionView />)
		expect(screen.getByTestId("logged-in").textContent).toBe("true")
		expect(screen.getByTestId("db-ready").textContent).toBe("true")
		expect(screen.getByTestId("offline").textContent).toBe("false")

		auth.isBootstrapping = true
		db.isReady = false
		await act(async () => {
			listeners.forEach((listener) => listener())
		})

		expect(screen.getByTestId("db-ready").textContent).toBe("false")
	})
})
