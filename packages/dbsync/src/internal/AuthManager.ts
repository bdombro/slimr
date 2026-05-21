import type { BackendAdapter } from "../adapters/types.js"
import { DbSyncNotAuthenticatedError, DbSyncOfflineError } from "../errors.js"
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
import type { EventBus } from "./EventBus.js"
import type { StorageManager } from "./storage/index.js"

type SessionCallback = () => void | Promise<void>
type SessionChangeListener = () => void

/**
 * Coordinates authentication state, cross-tab session sync, and logout behavior.
 */
export class AuthManager {
	private isLoggedInValue = readIsLoggedIn()
	private loginCallbacks = new Set<SessionCallback>()
	private logoutCallbacks = new Set<SessionCallback>()
	private sessionListeners = new Set<SessionChangeListener>()
	private bootstrapped = false
	private bootPromise: Promise<void> | null = null
	private onLoginInFlight: Promise<void> | null = null
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

	/** True while `onLogin` callbacks are running (bootstrap or login). */
	public get isBootstrapping() {
		return this.isBootstrappingValue
	}

	/** Subscribes to session/boot state changes (for React hooks). */
	public onSessionChange(listener: SessionChangeListener) {
		this.sessionListeners.add(listener)
		return { close: () => this.sessionListeners.delete(listener) }
	}

	/** Registers a callback invoked on login and cross-tab `AUTH_LOGIN`. */
	public onLogin(callback: SessionCallback) {
		this.loginCallbacks.add(callback)
		return { close: () => this.loginCallbacks.delete(callback) }
	}

	/** Registers a callback invoked early on logout / 401 / cross-tab `AUTH_LOGOUT`. */
	public onLogout(callback: SessionCallback) {
		this.logoutCallbacks.add(callback)
		return { close: () => this.logoutCallbacks.delete(callback) }
	}

	/**
	 * Replays a hydrated session: flushes pending remote logout, then runs all `onLogin` callbacks if logged in.
	 * Resolves when that work finishes (concurrent calls share one run).
	 */
	public async boot(): Promise<void> {
		if (!this.bootPromise) {
			this.bootPromise = this.runBoot()
		}
		return this.bootPromise
	}

	/** @deprecated Use `boot()` instead. */
	public async bootstrapSession(): Promise<void> {
		return this.boot()
	}

	private async runBoot(): Promise<void> {
		if (this.bootstrapped) return
		this.bootstrapped = true
		await this.flushPendingRemoteLogout()
		if (this.isLoggedInValue && !this.pendingLogout) {
			await this.fireOnLogin()
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
		if (!valid) await this.invalidateSession()
		return valid
	}

	/** Requests a one-time login code for the given email. */
	public async sendCode(email: string) {
		if (this.requiresAuth && this.connectivity.offline) throw new DbSyncOfflineError()
		return this.adapter.sendCode(email)
	}

	/** Logs in through the adapter and fires `onLogin`. */
	public async login(email: string, code: string) {
		if (this.requiresAuth && this.connectivity.offline) throw new DbSyncOfflineError()
		if (this.pendingLogout) {
			throw new Error("dbsync: cannot login while remote logout is pending")
		}
		await this.adapter.login(email, code)
		this.setLoggedIn(true)
		this.events.broadcastAuth("AUTH_LOGIN")
		await this.fireOnLogin()
	}

	/** Logs out: local wipe now; remote logout may defer when offline. */
	public async logout() {
		await this.performLogout({ remote: true, clearLocal: true, broadcast: true })
	}

	/** Called when sync receives 401 or revalidation fails. */
	public async invalidateSession() {
		if (this.isInvalidating) return
		this.isInvalidating = true
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
		await this.fireOnLogout()
		this.notifySessionChange()
	}

	/** Passive tab: session started elsewhere. */
	public async handlePassiveLogin() {
		this.setLoggedIn(true, { persist: true })
		await this.fireOnLogin()
	}

	private async performLogout(options: {
		remote: boolean
		clearLocal: boolean
		broadcast: boolean
	}) {
		await this.stopSync()
		this.setLoggedIn(false, { persist: true })
		if (options.broadcast) this.events.broadcastAuth("AUTH_LOGOUT")
		await this.fireOnLogout()

		if (options.clearLocal) {
			await this.storage.clearAllStores()
			clearSyncCursorKeys()
		}

		if (!options.remote) return

		if (this.connectivity.online) {
			await this.adapter.logout()
			writePendingLogout(false)
		} else {
			writePendingLogout(true)
		}
		this.notifySessionChange()
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

	private async fireOnLogin(): Promise<void> {
		if (this.onLoginInFlight) return this.onLoginInFlight

		this.onLoginInFlight = this.runOnLoginCallbacks()
		try {
			await this.onLoginInFlight
		} finally {
			this.onLoginInFlight = null
		}
	}

	private async runOnLoginCallbacks(): Promise<void> {
		this.isBootstrappingValue = true
		this.notifySessionChange()
		try {
			for (const callback of this.loginCallbacks) {
				await callback()
			}
		} finally {
			this.isBootstrappingValue = false
			this.notifySessionChange()
		}
	}

	private async fireOnLogout() {
		for (const callback of this.logoutCallbacks) {
			await callback()
		}
	}

	private notifySessionChange() {
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
