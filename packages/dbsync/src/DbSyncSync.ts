import type { AuthManager } from "./internal/AuthManager.js"
import { readHasSyncedSuccessfully } from "./internal/authStorage.js"
import type { EventBus, SyncState } from "./internal/EventBus.js"
import type { SyncEngine } from "./internal/SyncEngine.js"
import { promiseWithResolvers } from "./util/promises.js"

type SyncHost = {
	assertAuthenticated(): void
	ensureReady(): Promise<void>
}

/**
 * Background sync controls and status.
 */
export class DbSyncSync {
	constructor(
		private host: SyncHost,
		private syncEngine: SyncEngine,
		private events: EventBus,
		private auth: AuthManager,
	) {}

	/** Current sync state (`idle` | `syncing` | `offline` | `error`). */
	get state(): SyncState {
		return this.events.syncState
	}

	get isStarted() {
		return this.syncEngine.isStarted
	}

	get isLive() {
		return this.syncEngine.isLive
	}

	/** Logged in with no successful sync since login (cleared on logout). */
	get isInitialSyncPending() {
		if (!this.auth.isLoggedIn) return false
		return !readHasSyncedSuccessfully()
	}

	onStateChange(callback: (state: SyncState) => void) {
		return this.events.onSyncStateChange(callback)
	}

	async start() {
		this.host.assertAuthenticated()
		await this.host.ensureReady()
		this.syncEngine.start()
	}

	stop() {
		this.syncEngine.stop()
	}

	async trigger() {
		return this.syncEngine.triggerSync()
	}

	/** Playwright/tests: replace the next sync cycle body until cleared. */
	setPerformSyncHook(fn: (() => Promise<void>) | null) {
		this.syncEngine.setPerformSyncHook(fn)
	}

	async waitForLive() {
		return this.syncEngine.waitForLive()
	}

	/** Waits until a successful sync has completed since login. */
	async waitForInitial(): Promise<void> {
		if (!this.auth.isLoggedIn || readHasSyncedSuccessfully()) return
		const { promise, resolve, reject } = promiseWithResolvers<void>()
		if (!this.isStarted) {
			reject(new Error("dbsync: sync is not started"))
			return promise
		}
		const sessionSub = this.auth.onSessionChange(() => {
			if (!this.auth.isLoggedIn) {
				cleanup()
				reject(new Error("dbsync: session ended before initial sync completed"))
			}
		})
		const syncSub = this.onStateChange(() => {
			if (readHasSyncedSuccessfully()) {
				cleanup()
				resolve()
			}
		})
		const cleanup = () => {
			sessionSub.close()
			syncSub.close()
		}
		if (readHasSyncedSuccessfully()) {
			cleanup()
			resolve()
		}
		return promise
	}
}
