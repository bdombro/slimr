import type { BackendAdapter } from "../adapters/types.js"
import type { DbSyncDebugListener } from "../debugEvents.js"
import { DbSyncHttpError, DbSyncNotAuthenticatedError, DbSyncOfflineError } from "../errors.js"
import {
	AUTH_IS_LOGGED_IN_KEY,
	AUTH_PENDING_LOGOUT_KEY,
	clearSyncCursorKeys,
	readIsLoggedIn,
	readPendingLogout,
	writeIsLoggedIn,
	writePendingLogout,
} from "./authStorage.js"
import type { ConnectivityTracker } from "./ConnectivityTracker.js"
import { emitDebug } from "./debug.js"
import type { EventBus } from "./EventBus.js"
import {
	runListenersSettled,
	type SessionListener,
	throwListenerRejections,
} from "./listenerUtils.js"
import type { StorageManager } from "./storage/index.js"

type SessionChangeListener = () => void

/**
 * Coordinates authentication state, cross-tab session sync, and logout behavior.
 */
export class AuthManager {
	private isLoggedInValue = readIsLoggedIn()
	private sessionStartCallbacks = new Set<SessionListener>()
	private authenticatedCallbacks = new Set<SessionListener>()
	private logoutCallbacks = new Set<SessionListener>()
	private sessionListeners = new Set<SessionChangeListener>()
	private bootstrapped = false
	private isBootedValue = false
	private bootPromise: Promise<void> | null = null
	private sessionStartInFlight: Promise<void> | null = null
	private authenticatedInFlight: Promise<void> | null = null
	private isBootstrappingValue = false
	private isInvalidating = false

	/**
	 * @param adapter Backend used for login/logout/session checks.
	 * @param storage Cleared on logout.
	 * @param events BroadcastChannel for cross-tab auth.
	 * @param connectivity Online/offline tracking.
	 * @param stopSync Stops background sync on logout.
	 */
	constructor(
		private adapter: BackendAdapter,
		private storage: StorageManager,
		private events: EventBus,
		private connectivity: ConnectivityTracker,
		private stopSync: () => void | Promise<void>,
		private onDebug: DbSyncDebugListener | undefined,
		private getIsReady: () => boolean,
	) {
		this.setupCrossTab()
		this.connectivity.subscribe((offline) => {
			if (!offline) void this.onBackOnline()
		})
	}

	/** When false, data API guards are skipped; session APIs still run (adapter stubs network). */
	public get requiresAuth() {
		return this.adapter.requiresAuth !== false
	}

	/** Whether the app considers the user signed in (hydrated from localStorage). */
	public get isLoggedIn() {
		return this.isLoggedInValue
	}

	/** Whether a remote logout is deferred until online. */
	public get pendingLogout() {
		return readPendingLogout()
	}

	/** True while session-start or `onAuthenticated` callbacks are running. */
	public get isBootstrapping() {
		return this.isBootstrappingValue
	}

	/** True after the boot pipeline has finished. */
	public get isBooted() {
		return this.isBootedValue
	}

	/** Subscribes to session/boot state changes (for React hooks). */
	public onSessionChange(listener: SessionChangeListener) {
		this.sessionListeners.add(listener)
		return {
			close: () => {
				this.sessionListeners.delete(listener)
			},
		}
	}

	/** Internal: open storage / start sync when a hydrated session is restored (boot only). */
	public onSessionStart(callback: SessionListener) {
		this.sessionStartCallbacks.add(callback)
		return {
			close: () => {
				this.sessionStartCallbacks.delete(callback)
			},
		}
	}

	/** App hook: runs on `login()` and cross-tab `AUTH_LOGIN` — not on refresh boot. */
	public onAuthenticated(callback: SessionListener) {
		this.authenticatedCallbacks.add(callback)
		return {
			close: () => {
				this.authenticatedCallbacks.delete(callback)
			},
		}
	}

	/** App hook: runs before IDB clear on logout / 401; awaited in parallel via `allSettled`. */
	public onLogout(callback: SessionListener) {
		this.logoutCallbacks.add(callback)
		return {
			close: () => {
				this.logoutCallbacks.delete(callback)
			},
		}
	}

	/**
	 * Replays a hydrated session: flushes pending remote logout, then runs session-start when logged in.
	 * Resolves when that work finishes (concurrent calls share one run).
	 */
	public async boot(): Promise<void> {
		if (!this.bootPromise) {
			this.bootPromise = this.runBoot()
		}
		return this.bootPromise
	}

	private async runBoot(): Promise<void> {
		if (this.bootstrapped) return
		this.bootstrapped = true
		emitDebug(this.onDebug, { type: "boot:start" })
		try {
			await this.flushPendingRemoteLogout()
			if (this.isLoggedInValue && !this.pendingLogout) {
				await this.fireSessionStart()
			} else if (!this.requiresAuth) {
				await this.fireSessionStart()
			}
		} finally {
			this.isBootedValue = true
			this.notifySessionChange()
			emitDebug(this.onDebug, {
				type: "boot:done",
				isLoggedIn: this.isLoggedInValue,
				isReady: this.getIsReady(),
			})
		}
	}

	/** Throws when guarded APIs need a logged-in session. */
	public assertAuthenticated() {
		if (!this.requiresAuth) return
		if (!this.isLoggedInValue || this.pendingLogout) {
			throw new DbSyncNotAuthenticatedError()
		}
	}

	/** Whether sync should run (logged in, no pending remote logout). */
	public canSync() {
		if (!this.requiresAuth) return true
		return this.isLoggedInValue && !this.pendingLogout
	}

	/** Probes the server session; invalid session triggers logout flow. */
	public async revalidateSession() {
		if (this.requiresAuth && this.connectivity.offline) throw new DbSyncOfflineError()
		const valid = await this.adapter.checkAuth()
		if (!valid) await this.invalidateSession("revalidate")
		return valid
	}

	/** Requests a one-time login code for the given email. */
	public async sendCode(email: string) {
		if (this.requiresAuth && this.connectivity.offline) throw new DbSyncOfflineError()
		return this.adapter.sendCode(email)
	}

	/** Logs in through the adapter, then runs session-start and `onAuthenticated`. */
	public async login(email: string, code: string) {
		if (this.requiresAuth && this.connectivity.offline) throw new DbSyncOfflineError()
		if (this.pendingLogout) {
			throw new DbSyncHttpError(
				"pending_logout",
				"dbsync: cannot login while remote logout is pending",
			)
		}
		await this.adapter.login(email, code)
		this.setLoggedIn(true)
		clearSyncCursorKeys()
		this.events.broadcastAuth("AUTH_LOGIN")
		await this.fireSessionStart()
		await this.fireAuthenticated()
	}

	/** Logs out: local wipe now; remote logout may defer when offline. */
	public async logout() {
		await this.performLogout({ remote: true, clearLocal: true, broadcast: true })
	}

	/** Called when sync receives 401 or revalidation fails. */
	public async invalidateSession(reason: "401" | "revalidate" = "401") {
		if (this.isInvalidating) return
		this.isInvalidating = true
		emitDebug(this.onDebug, { type: "auth:invalidate", reason })
		try {
			await this.performLogout({ remote: false, clearLocal: true, broadcast: true })
		} finally {
			this.isInvalidating = false
		}
	}

	/** Passive tab: session ended elsewhere — UI teardown only. */
	public async handlePassiveLogout() {
		await this.stopSync()
		this.setLoggedIn(false, { persist: true })
		clearSyncCursorKeys()
		const results = await runListenersSettled(this.logoutCallbacks)
		this.notifySessionChange()
		throwListenerRejections(results)
	}

	/** Passive tab: session started elsewhere. */
	public async handlePassiveLogin() {
		this.setLoggedIn(true, { persist: true })
		await this.fireSessionStart()
		await this.fireAuthenticated()
	}

	private async performLogout(options: {
		remote: boolean
		clearLocal: boolean
		broadcast: boolean
	}) {
		await this.stopSync()
		this.setLoggedIn(false, { persist: true })
		if (options.broadcast) this.events.broadcastAuth("AUTH_LOGOUT")
		emitDebug(this.onDebug, { type: "session:logout", phase: "listeners" })
		const listenerResults = await runListenersSettled(this.logoutCallbacks)

		if (options.clearLocal) {
			await this.storage.clearAllStores()
			clearSyncCursorKeys()
			emitDebug(this.onDebug, { type: "session:logout", phase: "cleared" })
		} else {
			clearSyncCursorKeys()
		}

		if (!options.remote) {
			this.notifySessionChange()
			throwListenerRejections(listenerResults)
			return
		}

		if (this.connectivity.online) {
			await this.adapter.logout()
			writePendingLogout(false)
		} else {
			writePendingLogout(true)
		}
		emitDebug(this.onDebug, { type: "session:logout", phase: "remote" })
		this.notifySessionChange()
		throwListenerRejections(listenerResults)
	}

	private async onBackOnline() {
		await this.flushPendingRemoteLogout()
		if (this.isLoggedInValue && !this.pendingLogout) {
			try {
				await this.revalidateSession()
			} catch {
				// Offline race — ignore
			}
		}
	}

	private async flushPendingRemoteLogout() {
		if (!readPendingLogout() || this.connectivity.offline) return
		try {
			await this.adapter.logout()
		} finally {
			writePendingLogout(false)
			this.notifySessionChange()
		}
	}

	private setLoggedIn(value: boolean, options?: { persist?: boolean }) {
		this.isLoggedInValue = value
		if (options?.persist !== false) writeIsLoggedIn(value)
		this.notifySessionChange()
	}

	private async fireSessionStart(): Promise<void> {
		if (this.sessionStartInFlight) return this.sessionStartInFlight

		this.sessionStartInFlight = this.runSessionStartCallbacks()
		try {
			await this.sessionStartInFlight
		} finally {
			this.sessionStartInFlight = null
		}
	}

	private async runSessionStartCallbacks(): Promise<void> {
		if (this.sessionStartCallbacks.size === 0) return

		emitDebug(this.onDebug, { type: "session:start" })
		this.isBootstrappingValue = true
		this.notifySessionChange()
		try {
			const results = await runListenersSettled(this.sessionStartCallbacks)
			throwListenerRejections(results)
		} finally {
			this.isBootstrappingValue = false
			this.notifySessionChange()
		}
	}

	private async fireAuthenticated(): Promise<void> {
		if (this.authenticatedInFlight) return this.authenticatedInFlight

		this.authenticatedInFlight = this.runAuthenticatedCallbacks()
		try {
			await this.authenticatedInFlight
		} finally {
			this.authenticatedInFlight = null
		}
	}

	private async runAuthenticatedCallbacks(): Promise<void> {
		if (this.authenticatedCallbacks.size === 0) return

		emitDebug(this.onDebug, { type: "session:authenticated" })
		this.isBootstrappingValue = true
		this.notifySessionChange()
		try {
			const results = await runListenersSettled(this.authenticatedCallbacks)
			throwListenerRejections(results)
		} finally {
			this.isBootstrappingValue = false
			this.notifySessionChange()
		}
	}

	/** Notifies `onSessionChange` subscribers (e.g. `db.auth.onChange`). */
	public notifySessionChange() {
		this.sessionListeners.forEach((listener) => listener())
	}

	private setupCrossTab() {
		this.events.onAuthMessage((type) => {
			if (type === "AUTH_LOGOUT") void this.handlePassiveLogout()
			else if (type === "AUTH_LOGIN") void this.handlePassiveLogin()
		})

		if (typeof window === "undefined") return
		const onStorage = (event: StorageEvent) => {
			if (event.key !== AUTH_IS_LOGGED_IN_KEY && event.key !== AUTH_PENDING_LOGOUT_KEY) return
			const loggedIn = readIsLoggedIn()
			if (loggedIn && !this.isLoggedInValue) void this.handlePassiveLogin()
			else if (!loggedIn && this.isLoggedInValue) void this.handlePassiveLogout()
			this.notifySessionChange()
		}
		window.addEventListener("storage", onStorage)
	}
}
