import type { AuthManager } from "./internal/AuthManager.js"
import type { AuthObservables } from "./internal/AuthObservables.js"
import { readHasSyncedSuccessfully } from "./internal/authStorage.js"
import type { EventBus, SyncState } from "./internal/EventBus.js"
import type { SessionManager } from "./internal/SessionManager.js"
import type { SyncEngine } from "./internal/SyncEngine.js"
import type { SyncObservables } from "./internal/SyncObservables.js"
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
		private authObs: AuthObservables,
		private session: SessionManager,
		readonly observables: SyncObservables,
	) {}

	get state$() {
		return this.events.state$
	}

	get isStarted$() {
		return this.observables.isStarted$
	}

	get isLive$() {
		return this.observables.isLive$
	}

	/** Current sync state (`idle` | `syncing` | `offline` | `error`). */
	get state(): SyncState {
		return this.state$.val
	}

	get isStarted() {
		return this.syncEngine.isStarted
	}

	get isLive() {
		return this.syncEngine.isLive
	}

	async start() {
		this.host.assertAuthenticated()
		await this.host.ensureReady()
		this.syncEngine.start()
		void this.session.publish()
	}

	stop() {
		this.syncEngine.stop()
		void this.session.publish()
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
		const loginSub = this.auth.onSessionChange(() => {
			if (!this.auth.isLoggedIn) {
				cleanup()
				reject(new Error("dbsync: session ended before initial sync completed"))
			}
		})
		const pendingSub = this.authObs.initialSyncPending$.subscribe((pending: boolean) => {
			if (!pending) {
				cleanup()
				resolve()
			}
		})
		const cleanup = () => {
			loginSub.close()
			pendingSub()
		}
		if (!this.authObs.initialSyncPending$.val) {
			cleanup()
			resolve()
		}
		return promise
	}
}
