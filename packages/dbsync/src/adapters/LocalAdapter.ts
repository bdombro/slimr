import type { BackendAdapter, SyncPullResult } from "./types.js"

/**
 * A no-op network adapter for pure local-only usage.
 * Satisfies the DbSync adapter requirement and silently discards sync operations
 * so your local `dirtyQueue` doesn't grow infinitely if synchronization is enabled.
 */
export class LocalAdapter implements BackendAdapter {
	/** Data APIs skip login guards; session APIs use stubbed login/logout/checkAuth below. */
	public readonly requiresAuth = false as const

	/** Always returns true so session checks pass locally. */
	async checkAuth(): Promise<boolean> {
		return true
	}

	/** Always resolves true to mimic successful code delivery. */
	async sendCode(_email: string): Promise<boolean> {
		return true
	}

	/** Always resolves to mimic successful mock logins. */
	async login(): Promise<{ userId: string }> {
		return { userId: "local-user" }
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
