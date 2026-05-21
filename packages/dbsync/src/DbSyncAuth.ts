import type { AuthManager } from "./internal/AuthManager.js"
import type { SessionListener } from "./internal/listenerUtils.js"

/**
 * Authentication actions and session state for a `DbSync` instance.
 * Boot lifecycle (`isBooted`, `waitForBooted`) lives on the root `db` object.
 */
export class DbSyncAuth {
	constructor(private authManager: AuthManager) {}

	/** Whether the app considers the user signed in (hydrated from localStorage). */
	get isLoggedIn() {
		return this.authManager.isLoggedIn
	}

	/** Whether a remote logout is deferred until online. */
	get pendingLogout() {
		return this.authManager.pendingLogout
	}

	/** True while session-start or `onAuthenticated` callbacks are running. */
	get isBootstrapping() {
		return this.authManager.isBootstrapping
	}

	/** Subscribes to session state changes (for React hooks). */
	onSessionChange(listener: () => void) {
		return this.authManager.onSessionChange(listener)
	}

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
