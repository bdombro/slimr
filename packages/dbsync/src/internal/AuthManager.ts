import type { BackendAdapter } from "../adapters/types.js"
import type { StorageManager } from "./StorageManager.js"

/**
 * Coordinates authentication state and logout/reset behavior for `DbSync`.
 */
export class AuthManager {
	/** Tracks whether the current backend session is authenticated. */
	public isAuth = false

	/**
	 * Creates a new auth manager for the provided backend adapter and storage layer.
	 *
	 * @param adapter The backend adapter used for auth requests.
	 * @param storage The storage manager used for reset operations.
	 * @param stopSync The callback used to stop background sync.
	 */
	constructor(
		private adapter: BackendAdapter,
		private storage: StorageManager,
		private stopSync: () => Promise<void> | void,
	) {}

	/** Checks authentication against the backend adapter and stores the result. */
	public async checkAuth() {
		this.isAuth = await this.adapter.checkAuth()
		return this.isAuth
	}

	/** Logs in through the backend adapter and updates auth state. */
	public async login(email: string, code: string) {
		this.isAuth = await this.adapter.login(email, code)
	}

	/** Logs out, stops sync, and clears auth state. */
	public async logout() {
		await this.stopSync()
		this.isAuth = false
		await this.adapter.logout()
	}

	/** Logs out and clears all local IndexedDB stores and auth markers. */
	public async reset() {
		await this.logout()
		await this.storage.clearAllStores()
		localStorage.removeItem("dbsync-lastSuccessAt")
		localStorage.removeItem("dbsync-pullSyncedUpTo")
	}
}
