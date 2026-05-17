import { createUid } from "@slimr/util"
import type { BackendAdapter } from "./adapters/types.js"
import { AuthManager } from "./internal/AuthManager.js"
import { EventBus, type SyncState } from "./internal/EventBus.js"
import { StorageManager } from "./internal/StorageManager.js"
import { SyncEngine } from "./internal/SyncEngine.js"

export interface DbSyncTableConfig {
	/** Optional index names to create for the store. */
	indexes?: string[]
	/** Optional callback that fills in default fields before write operations. */
	beforeWrite?: (value: any) => any
}

export interface DbSyncConfig {
	/** The backend adapter used for authentication and synchronization. */
	adapter: BackendAdapter

	/** Optional fixed IndexedDB version. */
	version?: number
	/** The object stores and their index definitions. */
	tables: Record<string, DbSyncTableConfig>
}

export type { SyncState }

/**
 * The public facade for the dbsync engine.
 */
export class DbSync {
	/** The polling interval used by the sync engine in milliseconds. */
	public syncInterval = 5000
	/** The active configuration passed by the consumer. */
	public config: DbSyncConfig

	/** The event bus used for local and cross-tab notifications. */
	private events: EventBus
	/** The storage manager handling IndexedDB state and transactions. */
	public storage: StorageManager // Public for tests currently (we can wrap it later)
	/** The engine responsible for network synchronization. */
	private syncEngine: SyncEngine
	/** The manager handling authentication and logout/reset behavior. */
	private authManager: AuthManager

	/**
	 * Creates a new `DbSync` instance using the supplied configuration.
	 *
	 * @param config The backend adapter, schema version, and table definitions.
	 */
	constructor(config: DbSyncConfig) {
		this.config = config
		this.events = new EventBus()

		const adapter = config.adapter

		const onSchemaChange = () => this.onSchemaChangeDetected()

		this.storage = new StorageManager(config, this.events, onSchemaChange)

		this.authManager = new AuthManager(adapter, this.storage, () => {
			void this.stop()
		})

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

	/** Returns a fresh RFC-4122 UUID. */
	public genUuid() {
		return createUid()
	}

	/** Whether the storage layer has finished initializing. */
	public get initted() {
		return this.storage.initted
	}
	/** Initializes the underlying IndexedDB stores. */
	public async init() {
		return this.storage.init()
	}
	/** Returns a queued transaction object for batched writes. */
	public getTransaction() {
		return this.storage.getTransaction()
	} // Exported temporarily for tests

	/** Reads a typed record by primary key. */
	public async get<T>(storeName: string, id: string | number): Promise<T | undefined> {
		return this.storage.get<T>(storeName, id)
	}
	/** Reads all records from the given object store. */
	public async findAll<T>(storeName: string): Promise<T[]> {
		return this.storage.findAll<T>(storeName)
	}
	/** Inserts a new record into the given object store. */
	public async add<T>(storeName: string, value: any, key?: string | number): Promise<T> {
		const [executedWrite] = await this.storage.executeTransaction([
			{ type: "add", storeName, value, key },
		])
		return executedWrite?.value as T
	}
	/** Partially updates an existing record in the given object store. */
	public async patch<T>(storeName: string, value: Partial<T>, key?: string | number): Promise<T> {
		await this.storage.executeTransaction([{ type: "patch", storeName, value, key }])
		return value as T
	}
	/** Upserts a record into the given object store. */
	public async put<T>(storeName: string, value: any, key?: string | number): Promise<T> {
		const [executedWrite] = await this.storage.executeTransaction([
			{ type: "put", storeName, value, key },
		])
		return executedWrite?.value as T
	}
	/** Deletes a record from the given object store. */
	public async delete(storeName: string, key: string | number): Promise<void> {
		await this.storage.executeTransaction([{ type: "delete", storeName, key }])
	}
	/** Clears all records from the given object store. */
	public async clear(storeName: string): Promise<void> {
		await this.storage.executeTransaction([{ type: "clear", storeName }])
	}

	/** Subscribes to store update notifications. */
	public subscribe(callback: (stores: string[]) => void) {
		return this.events.subscribe(callback)
	}
	/** Subscribes to sync state changes. */
	public onSyncStateChange(callback: (state: SyncState) => void) {
		return this.events.onSyncStateChange(callback)
	}

	/** Whether the current backend session is authenticated. */
	public get isAuth() {
		return this.authManager.isAuth
	}
	/** Verifies authentication against the backend adapter. */
	public async checkAuth() {
		return this.authManager.checkAuth()
	}
	/** Logs in with the given credentials. */
	public async login(email: string, code: string) {
		return this.authManager.login(email, code)
	}
	/** Logs out and clears auth state. */
	public async logout() {
		return this.authManager.logout()
	}
	/** Logs out and clears the local database. */
	public async reset() {
		return this.authManager.reset()
	}

	/** Whether background sync is currently enabled. */
	public get isStarted() {
		return this.syncEngine.isStarted
	}
	/** Whether the sync engine has recently connected successfully. */
	public get isLive() {
		return this.syncEngine.isLive
	}
	/** Starts periodic background synchronization. */
	public async start() {
		if (!this.initted) await this.init()

		this.syncEngine.start()
	}
	/** Stops periodic background synchronization. */
	public async stop() {
		this.syncEngine.stop()
	}
	/** Waits until the sync engine reports a live connection. */
	public async waitForLive() {
		return this.syncEngine.waitForLive()
	}
	/** Triggers a single sync cycle immediately. */
	public async triggerSync() {
		return this.syncEngine.triggerSync()
	}

	/** Legacy alias for `enable()`. */
	public startSyncInterval() {
		this.start()
	}
	/** Legacy alias for `disable()`. */
	public stopSyncInterval() {
		this.stop()
	}

	/** Responds to schema changes by disposing state and reloading the page. */
	protected onSchemaChangeDetected() {
		this.storage.dispose()
		this.stop()
		if (typeof window !== "undefined") {
			window.location.reload()
		}
	}

	/** Disposes all background resources and event listeners. */
	public dispose() {
		this.stop()
		this.events.dispose()
		this.storage.dispose()
	}
}
