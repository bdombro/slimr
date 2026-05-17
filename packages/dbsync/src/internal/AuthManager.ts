import type { BackendAdapter } from "../adapters/types.js"
import type { StorageManager } from "./StorageManager.js"

export class AuthManager {
	public isAuth = false

	constructor(
		private adapter: BackendAdapter,
		private storage: StorageManager,
		private disableSync: () => void,
	) {}

	public async checkAuth() {
		this.isAuth = await this.adapter.checkAuth()
		return this.isAuth
	}

	public async login(email: string, code: string) {
		this.isAuth = await this.adapter.login(email, code)
	}

	public async logout() {
		this.disableSync()
		this.isAuth = false
		await this.adapter.logout()
	}

	public async reset() {
		await this.logout()
		await this.storage.clearAllStores()
		localStorage.removeItem("dbsync-lastSuccessAt")
		localStorage.removeItem("dbsync-pullSyncedUpTo")
	}
}
