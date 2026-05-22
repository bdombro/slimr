import type { DbAuthPhase } from "../authTypes.js"
import type { AuthManager } from "./AuthManager.js"
import type { AuthObservables } from "./AuthObservables.js"
import { readHasSyncedSuccessfully } from "./authStorage.js"
import type { ConnectivityTracker } from "./ConnectivityTracker.js"
import type { EventBus, SyncState } from "./EventBus.js"
import type { SyncEngine } from "./SyncEngine.js"
import type { SyncObservables } from "./SyncObservables.js"

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

/**
 * Derives session phase/flags and publishes per-field observables when auth, boot, sync, or connectivity changes.
 */
export class SessionManager {
	constructor(
		private auth: AuthManager,
		private getIsReady: () => boolean,
		private connectivity: ConnectivityTracker,
		private syncEngine: SyncEngine,
		private events: EventBus,
		private authObs: AuthObservables,
		private syncObs: SyncObservables,
		private requiresAuth: boolean,
	) {
		this.auth.onSessionChange(() => void this.publish())
		void this.events.state$.subscribe(() => void this.publish())
		this.connectivity.subscribe(() => void this.publish())
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
			state: this.events.state$.val,
			isLive: this.syncEngine.isLive,
			isStarted: this.syncEngine.isStarted,
		}
		return {
			phase: this.resolvePhase(flags),
			flags,
			sync,
		}
	}

	/** Recomputes snapshot and updates auth/sync observables (deep-equal no-ops). */
	public async publish() {
		const snap = this.get()
		const { flags, sync } = snap
		const initialSyncPending = flags.isLoggedIn && !readHasSyncedSuccessfully()
		const canQuery = flags.isReady && (!this.requiresAuth || flags.isLoggedIn)

		await Promise.all([
			this.authObs.phase$.set(snap.phase),
			this.authObs.isInitialSyncPending$.set(initialSyncPending),
			this.authObs.canQuery$.set(canQuery),
			this.authObs.isLoggedIn$.set(flags.isLoggedIn),
			this.authObs.isReady$.set(flags.isReady),
			this.authObs.isBooted$.set(flags.isBooted),
			this.authObs.isBootstrapping$.set(flags.isBootstrapping),
			this.authObs.pendingLogout$.set(flags.pendingLogout),
			this.authObs.offline$.set(flags.offline),
			this.authObs.online$.set(!flags.offline),
			this.syncObs.isStarted$.set(sync.isStarted),
			this.syncObs.isLive$.set(sync.isLive),
		])
	}

	private resolvePhase(flags: SessionSnapshot["flags"]): DbAuthPhase {
		if (!flags.isLoggedIn) return "logged-out"
		if (!flags.isBooted || !flags.isReady || flags.isBootstrapping) return "booting"
		if (!readHasSyncedSuccessfully()) return "initial-sync"
		return "ready"
	}
}
