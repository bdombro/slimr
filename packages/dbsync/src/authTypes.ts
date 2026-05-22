import type { SyncState } from "./internal/EventBus.js"

/** High-level app shell phase derived from auth, boot, and sync state. */
export type DbAuthPhase = "logged-out" | "booting" | "initial-sync" | "ready"

/** Flat session/auth state returned by `useDbAuth` (assembled from `db.auth` getters). */
export type DbAuthState = {
	phase: DbAuthPhase
	isLoggedIn: boolean
	isBooted: boolean
	isReady: boolean
	isBootstrapping: boolean
	pendingLogout: boolean
	offline: boolean
	online: boolean
	syncState: SyncState
}

export type { SyncState }

/** @deprecated Use `DbAuthPhase`. */
export type DbSessionPhase = DbAuthPhase

/** @deprecated Use `DbAuthState`. */
export type DbSessionSnapshot = DbAuthState
