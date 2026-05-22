import type { DbAuthPhase } from "../authTypes.js"
import type { SyncState } from "./EventBus.js"

/** Internal grouped snapshot; public API uses `db.auth` shallow getters. */
type SessionSnapshot = {
	phase: DbAuthPhase
	flags: {
		isLoggedIn: boolean
		isBooted: boolean
		isReady: boolean
		isBootstrapping: boolean
		pendingLogout: boolean
		offline: boolean
	}
	sync: {
		state: SyncState
		isLive: boolean
		isStarted: boolean
	}
}

import type { AuthManager } from "./AuthManager.js"
import { readHasSyncedSuccessfully } from "./authStorage.js"
import type { ConnectivityTracker } from "./ConnectivityTracker.js"
import type { EventBus } from "./EventBus.js"
import type { SyncEngine } from "./SyncEngine.js"

type SessionListener = () => void

/**
 * Derives session phase/flags and notifies `db.auth.onChange` when auth, boot, sync, or connectivity changes.
 */
export class SessionManager {
	private listeners = new Set<SessionListener>()

	constructor(
		private auth: AuthManager,
		private getIsReady: () => boolean,
		private connectivity: ConnectivityTracker,
		private syncEngine: SyncEngine,
		private events: EventBus,
	) {
		this.auth.onSessionChange(() => this.notify())
		this.events.onSyncStateChange(() => this.notify())
		this.connectivity.subscribe(() => this.notify())
	}

	/** Current session snapshot (synchronous). */
	public get(): SessionSnapshot {
		const flags = {
			isLoggedIn: this.auth.isLoggedIn,
			isBooted: this.auth.isBooted,
			isReady: this.getIsReady(),
			isBootstrapping: this.auth.isBootstrapping,
			pendingLogout: this.auth.pendingLogout,
			offline: this.connectivity.offline,
		}
		const sync = {
			state: this.events.syncState,
			isLive: this.syncEngine.isLive,
			isStarted: this.syncEngine.isStarted,
		}
		return {
			phase: this.resolvePhase(flags),
			flags,
			sync,
		}
	}

	/** Subscribes to snapshot changes. */
	public subscribe(listener: SessionListener) {
		this.listeners.add(listener)
		return {
			close: () => {
				this.listeners.delete(listener)
			},
		}
	}

	private resolvePhase(flags: SessionSnapshot["flags"]): DbAuthPhase {
		if (!flags.isLoggedIn) return "logged-out"
		if (!flags.isBooted || !flags.isReady || flags.isBootstrapping) return "booting"
		if (!readHasSyncedSuccessfully()) return "initial-sync"
		return "ready"
	}

	private notify() {
		this.listeners.forEach((listener) => listener())
	}
}
