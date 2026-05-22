import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import type { DbAuthPhase, SyncState } from "./authTypes.js"
import { useDbSession } from "./useDbSession.js"

afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

describe("useDbSession", () => {
	test("reflects db.auth getters and updates on onChange", async () => {
		let phase: DbAuthPhase = "initial-sync"
		let syncState: SyncState = "syncing"
		const listeners = new Set<() => void>()
		const db = {
			auth: {
				get phase() {
					return phase
				},
				get isLoggedIn() {
					return true
				},
				get isBooted() {
					return true
				},
				get isReady() {
					return true
				},
				get isBootstrapping() {
					return false
				},
				get pendingLogout() {
					return false
				},
				get offline() {
					return false
				},
				get online() {
					return true
				},
				get syncState() {
					return syncState
				},
				onChange: (listener: () => void) => {
					listeners.add(listener)
					return { close: () => listeners.delete(listener) }
				},
			},
		}

		function SessionView() {
			const session = useDbSession(db as never)
			return (
				<div>
					<span data-testid="phase">{session.phase}</span>
					<span data-testid="logged-in">{String(session.isLoggedIn)}</span>
					<span data-testid="sync-state">{session.syncState}</span>
				</div>
			)
		}

		render(<SessionView />)
		expect(screen.getByTestId("phase").textContent).toBe("initial-sync")
		expect(screen.getByTestId("logged-in").textContent).toBe("true")
		expect(screen.getByTestId("sync-state").textContent).toBe("syncing")

		phase = "ready"
		syncState = "idle"
		await act(async () => {
			listeners.forEach((listener) => listener())
		})

		expect(screen.getByTestId("phase").textContent).toBe("ready")
		expect(screen.getByTestId("sync-state").textContent).toBe("idle")
	})
})
