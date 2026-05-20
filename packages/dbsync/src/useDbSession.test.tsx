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
		const db = {
			isLoggedIn: true,
			isBootstrapping: false,
			initted: true,
			offline: false,
			online: true,
			onSessionChange: (listener: () => void) => {
				listeners.add(listener)
				return { close: () => listeners.delete(listener) }
			},
		}

		function SessionView() {
			const session = useDbSession(db as never)
			return (
				<div>
					<span data-testid="logged-in">{String(session.isLoggedIn)}</span>
					<span data-testid="db-ready">{String(session.isDbReady)}</span>
					<span data-testid="offline">{String(session.offline)}</span>
				</div>
			)
		}

		render(<SessionView />)
		expect(screen.getByTestId("logged-in").textContent).toBe("true")
		expect(screen.getByTestId("db-ready").textContent).toBe("true")
		expect(screen.getByTestId("offline").textContent).toBe("false")

		db.isBootstrapping = true
		db.initted = false
		await act(async () => {
			listeners.forEach((listener) => listener())
		})

		expect(screen.getByTestId("db-ready").textContent).toBe("false")
	})
})
