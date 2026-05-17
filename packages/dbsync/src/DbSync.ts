import type { BackendAdapter } from "./adapters/types.js"
import { AuthManager } from "./internal/AuthManager.js"
import { EventBus, type SyncState } from "./internal/EventBus.js"
import { StorageManager } from "./internal/StorageManager.js"
import { SyncEngine } from "./internal/SyncEngine.js"
import { genUuid } from "./internal/utils.js"

export interface DbSyncConfig {
	adapter: BackendAdapter

	version?: number
	tables: Record<string, { indexes?: string[] }>
}

export type { SyncState }

export class DbSync {
	public syncInterval = 5000
	public config: DbSyncConfig

	// Internal managers
	private events: EventBus
	public storage: StorageManager // Public for tests currently (we can wrap it later)
	private syncEngine: SyncEngine
	private authManager: AuthManager

	constructor(config: DbSyncConfig) {
		this.config = config
		this.events = new EventBus()

		const adapter = config.adapter

		const onSchemaChange = () => this.onSchemaChangeDetected()

		this.storage = new StorageManager(config, this.events, onSchemaChange)

		this.authManager = new AuthManager(adapter, this.storage, () => this.disable())

		this.syncEngine = new SyncEngine(
			config,
			this.syncInterval,
			this.events,
			this.storage,
			this.authManager,
			adapter,
			onSchemaChange,
		)
	}

	// Facade to Utils
	public genUuid() {
		return genUuid()
	}

	// Facade to StorageManager
	public get initted() {
		return this.storage.initted
	}
	public async init() {
		return this.storage.init()
	}
	public getTransaction() {
		return this.storage.getTransaction()
	} // Exported temporarily for tests

	public async get<T>(storeName: string, id: string | number): Promise<T | undefined> {
		return this.storage.get<T>(storeName, id)
	}
	public async findAll<T>(storeName: string): Promise<T[]> {
		return this.storage.findAll<T>(storeName)
	}
	public async add<T>(storeName: string, value: any, key?: string | number): Promise<T> {
		await this.storage.executeTransaction([{ type: "add", storeName, value, key }])
		return value
	}
	public async put<T>(storeName: string, value: any, key?: string | number): Promise<T> {
		await this.storage.executeTransaction([{ type: "put", storeName, value, key }])
		return value
	}
	public async delete(storeName: string, key: string | number): Promise<void> {
		await this.storage.executeTransaction([{ type: "delete", storeName, key }])
	}
	public async clear(storeName: string): Promise<void> {
		await this.storage.executeTransaction([{ type: "clear", storeName }])
	}

	// Facade to EventBus
	public subscribe(callback: (stores: string[]) => void) {
		return this.events.subscribe(callback)
	}
	public onSyncStateChange(callback: (state: SyncState) => void) {
		return this.events.onSyncStateChange(callback)
	}

	// Facade to AuthManager
	public get isAuth() {
		return this.authManager.isAuth
	}
	public async checkAuth() {
		return this.authManager.checkAuth()
	}
	public async login(email: string, code: string) {
		return this.authManager.login(email, code)
	}
	public async logout() {
		return this.authManager.logout()
	}
	public async reset() {
		return this.authManager.reset()
	}

	// Facade to SyncEngine
	public get isEnabled() {
		return this.syncEngine.isEnabled
	}
	public get isLive() {
		return this.syncEngine.isLive
	}
	public enable() {
		this.syncEngine.enable()
	}
	public disable() {
		this.syncEngine.disable()
	}
	public async waitForLive() {
		return this.syncEngine.waitForLive()
	}
	public async triggerSync() {
		return this.syncEngine.triggerSync()
	}

	// Legacy aliases
	public startSyncInterval() {
		this.enable()
	}
	public stopSyncInterval() {
		this.disable()
	}

	protected onSchemaChangeDetected() {
		this.storage.dispose()
		this.disable()
		if (typeof window !== "undefined") {
			window.location.reload()
		}
	}

	public dispose() {
		this.disable()
		this.events.dispose()
		this.storage.dispose()
	}
}
