import type { BackendAdapter, SyncPullResult } from "./types.js"

/**
 * A no-op network adapter for pure local-only usage.
 * Satisfies the DbSync adapter requirement and silently discards sync operations
 * so your local `dirtyQueue` doesn't grow infinitely if synchronization is enabled.
 */
export class LocalAdapter implements BackendAdapter {
	/** Always returns true so session checks pass locally. */
	async checkAuth(): Promise<boolean> {
		return true
	}

	/** Always resolves true to mimic successful mock logins. */
	async login(): Promise<boolean> {
		return true
	}

	/** Does nothing natively. */
	async logout(): Promise<void> {}

	/** Returns an empty payload because there is no remote source of truth. */
	async pull(): Promise<SyncPullResult> {
		return { items: [], hasMore: false }
	}

	/** Silently drops write payloads into the void. */
	async push(): Promise<void> {}
}
