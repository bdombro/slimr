import type { AuthManager } from "./internal/AuthManager.js"
import type { SessionListener } from "./internal/listenerUtils.js"

/**
 * Authentication actions for a `DbSync` instance.
 * Session state (`isLoggedIn`, etc.) lives on the root `db` object.
 */
export class DbSyncAuth {
	constructor(private authManager: AuthManager) {}

	/**
	 * Subscribes to logout (`db.auth.logout()`, 401, cross-tab). Listeners run in parallel
	 * before IndexedDB is cleared; rejections propagate after teardown completes.
	 */
	onLogout(listener: SessionListener): () => void {
		return this.authManager.onLogout(listener)
	}

	/**
	 * Subscribes to successful login and cross-tab login — not refresh boot.
	 * Listeners run in parallel after internal `start()`.
	 */
	onAuthenticated(listener: SessionListener): () => void {
		return this.authManager.onAuthenticated(listener)
	}

	/** Requests a one-time login code for the given email. */
	sendCode(email: string) {
		return this.authManager.sendCode(email)
	}

	/** Logs in through the adapter and runs authenticated callbacks. */
	login(email: string, code: string) {
		return this.authManager.login(email, code)
	}

	/** Logs out, clears local data, and may defer remote logout when offline. */
	logout() {
		return this.authManager.logout()
	}

	/** Probes the server session; invalid session triggers logout flow. */
	revalidate() {
		return this.authManager.revalidateSession()
	}
}
