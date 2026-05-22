import type { DbAuthPhase } from "./authTypes.js"
import type { AuthManager } from "./internal/AuthManager.js"
import type { AuthObservables } from "./internal/AuthObservables.js"
import type { SessionListener } from "./internal/listenerUtils.js"
import type { SessionManager } from "./internal/SessionManager.js"

/**
 * Authentication actions and session read accessors for a `DbSync` instance.
 */
export class DbSyncAuth {
	constructor(
		private authManager: AuthManager,
		private session: SessionManager,
		readonly observables: AuthObservables,
	) {}

	get phase$() {
		return this.observables.phase$
	}

	get isInitialSyncPending$() {
		return this.observables.isInitialSyncPending$
	}

	get canQuery$() {
		return this.observables.canQuery$
	}

	get isLoggedIn$() {
		return this.observables.isLoggedIn$
	}

	get isReady$() {
		return this.observables.isReady$
	}

	get isBooted$() {
		return this.observables.isBooted$
	}

	get isBootstrapping$() {
		return this.observables.isBootstrapping$
	}

	get pendingLogout$() {
		return this.observables.pendingLogout$
	}

	get offline$() {
		return this.observables.offline$
	}

	get online$() {
		return this.observables.online$
	}

	/** App shell phase (`logged-out` | `booting` | `initial-sync` | `ready`). */
	get phase(): DbAuthPhase {
		return this.phase$.val
	}

	get isLoggedIn() {
		return this.authManager.isLoggedIn
	}

	get pendingLogout() {
		return this.authManager.pendingLogout
	}

	get isBootstrapping() {
		return this.authManager.isBootstrapping
	}

	get isBooted() {
		return this.authManager.isBooted
	}

	get isReady() {
		return this.session.get().flags.isReady
	}

	get offline() {
		return this.session.get().flags.offline
	}

	get online() {
		return !this.offline
	}

	/** Logged in with no successful sync since login (cleared on logout). */
	get isInitialSyncPending() {
		return this.isInitialSyncPending$.val
	}

	/** Whether IndexedDB queries may run (`isReady` and auth gate). */
	get canQuery() {
		return this.canQuery$.val
	}

	/**
	 * Subscribes to logout (`db.auth.logout()`, 401, cross-tab). Listeners run in parallel
	 * before IndexedDB is cleared; rejections propagate after teardown completes.
	 */
	onLogout(listener: SessionListener) {
		return this.authManager.onLogout(listener)
	}

	/**
	 * Subscribes to successful login and cross-tab login — not refresh boot.
	 * Listeners run in parallel after internal `sync.start()`.
	 */
	onAuthenticated(listener: SessionListener) {
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
