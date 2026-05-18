import { createUid } from "@slimr/util"
import type { BackendAdapter } from "./adapters/types.js"
import { DbRepository } from "./DbRepository.js"
import { DbTxRepository } from "./DbTxRepository.js"
import type { DbTable } from "./DbTable.js"
import { AuthManager } from "./internal/AuthManager.js"
import { EventBus, type SyncState } from "./internal/EventBus.js"
import {
	type MigrationManagerMigration as Migration,
	MigrationManager,
} from "./internal/MigrationManager.js"
import { applyDefaults, StorageManager } from "./internal/StorageManager.js"
import { SyncEngine } from "./internal/SyncEngine.js"
import type { FindOptions } from "./DbRepository.js"

export type { Migration }

export interface DbSyncTableConfig {
	/** Optional index names to create for the store. */
	indexes?: string[]
	/** Optional callback that fills in default fields before write operations. */
	defaultSetter?: (value: any) => any
	/** Optional migrations to run on records when the schema evolves. */
	migrations?: Migration[]
}

export interface DbSyncConfig {
	/** The backend adapter used for authentication and synchronization. */
	adapter: BackendAdapter

	/** Optional fixed IndexedDB version. */
	version?: number
	/** The object stores and their index definitions. */
	tables?: Record<string, DbSyncTableConfig>
}

export interface DbSyncResolvedTable {
	storeName: string
	indexes?: string[]
	migrations?: Migration[]
	prepareCreate?: (value: any) => any
	preparePut?: (value: any) => any
	preparePatch?: (value: any) => any
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
	/** Runtime-registered table instances for class-based schemas. */
	private tableRegistry = new Map<string, DbTable<any, any>>()

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

		this.storage = new StorageManager(config, this.events, onSchemaChange, () => this.getSchemaTables())

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
			() => this.getSchemaTables(),
		)

		for (const storeName of Object.keys(config.tables ?? {})) {
			;(this as Record<string, unknown>)[storeName] = new DbRepository(this, storeName)
		}

		// Return a Proxy interceptor so that subclasses declaring typed table properties 
		// (e.g. `todos!: DbRepository<Todo>`) do not overwrite the repositories with `undefined`
		// when their field initializers run.
		const knownStores = config.tables ?? {}
		return new Proxy(this, {
			defineProperty(target, prop, desc) {
				if (typeof prop === "string" && prop in knownStores && desc.value === undefined) {
					return true
				}
				return Reflect.defineProperty(target, prop, desc)
			},
		})
	}

	/** Registers a runtime table instance and makes it available to schema-aware helpers. */
	public registerTable(table: DbTable<any, any>) {
		this.tableRegistry.set(table.storeName, table)
		if (!(table.storeName in this)) {
			;(this as Record<string, unknown>)[table.storeName] = table
		}
	}

	/** Resolves the active table definitions from static config and runtime registrations. */
	private getSchemaTables(): DbSyncResolvedTable[] {
		const resolvedTables = new Map<string, DbSyncResolvedTable>()

		for (const [storeName, tableConfig] of Object.entries(this.config.tables ?? {})) {
			resolvedTables.set(storeName, {
				storeName,
				indexes: tableConfig.indexes?.slice(),
				migrations: tableConfig.migrations?.slice(),
				prepareCreate: (value) => applyDefaults(tableConfig, value),
				preparePut: (value) => applyDefaults(tableConfig, value),
				preparePatch: (value) => value,
			})
		}

		for (const table of this.tableRegistry.values()) {
			const tableConstructor = table.constructor as { indexes?: string[]; migrations?: Migration[] }
			resolvedTables.set(table.storeName, {
				storeName: table.storeName,
				indexes: tableConstructor.indexes?.slice(),
				migrations: tableConstructor.migrations?.slice(),
				prepareCreate: (value) => table.prepareCreate(value),
				preparePut: (value) => table.preparePut(value),
				preparePatch: (value) => table.preparePatch(value),
			})
		}

		return [...resolvedTables.values()].sort((left, right) => left.storeName.localeCompare(right.storeName))
	}

	/** Resolves a single table definition by store name, if one exists. */
	private getSchemaTable(storeName: string) {
		return this.getSchemaTables().find((table) => table.storeName === storeName)
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
		await this.storage.init()

		const schemaMigrations: Record<string, Migration[]> = {}
		let hasMigrations = false
		for (const table of this.getSchemaTables()) {
			if (table.migrations && table.migrations.length > 0) {
				schemaMigrations[table.storeName] = table.migrations
				hasMigrations = true
			}
		}

		if (hasMigrations) {
			const migrationManager = new MigrationManager(this)
			await migrationManager.runAll(schemaMigrations)
		}
	}
	/** Applies the configured migrations for a single store to the provided record. */
	public async upgradeRecord<T extends Record<string, any>>(
		storeName: string,
		record: T,
	): Promise<T> {
		const migrations = this.getSchemaTable(storeName)?.migrations || []
		if (migrations.length === 0) {
			return record
		}

		const upgradedRecord = { ...record }
		await MigrationManager.upgradeRecord(upgradedRecord, migrations)
		return upgradedRecord as T
	}
	/** Applies the configured defaultSetter/defaulting logic for a single store without persisting. */
	public applyDefaults<T extends Record<string, any>>(storeName: string, record: T): T {
		const registeredTable = this.tableRegistry.get(storeName)
		if (registeredTable) {
			return registeredTable.prepareCreate(record) as T
		}
		return applyDefaults(this.config.tables?.[storeName], record)
	}
	/** Returns a queued transaction object for batched writes. */
	public getTransaction() {
		const tx = this.storage.getTransaction()
		const txWithTables = tx as unknown as Record<string, unknown>
		for (const table of this.getSchemaTables()) {
			txWithTables[table.storeName] = new DbTxRepository(tx, table.storeName, table)
		}
		return tx
	} // Exported temporarily for tests

	/** Reads a typed record by primary key. */
	public async get<T>(storeName: string, id: string | number): Promise<T | undefined> {
		return this.storage.get<T>(storeName, id)
	}
	/** Reads all records from the given object store. */
	public async getAll<T>(storeName: string): Promise<T[]> {
		return this.storage.getAll<T>(storeName)
	}
	/** Reads records matching a query from the given object store. */
	public async find<T>(storeName: string, options: FindOptions = {}): Promise<T[]> {
		return this.storage.find<T>(storeName, options)
	}
	/** Reads the first record matching an index/value pair. */
	public async getBy<T>(
		storeName: string,
		indexName: string,
		value: string | number,
	): Promise<T | undefined> {
		return this.storage.getBy<T>(storeName, indexName, value)
	}
	/** Streams records matching a query from the given object store. */
	public stream<T>(storeName: string, options: FindOptions = {}): AsyncGenerator<T> {
		return this.storage.stream<T>(storeName, options)
	}
	/** Streams every record from the given object store. */
	public streamAll<T>(storeName: string): AsyncGenerator<T> {
		return this.storage.streamAll<T>(storeName)
	}
	/** @deprecated Use getAll(). */
	public async findAll<T>(storeName: string): Promise<T[]> {
		return this.getAll<T>(storeName)
	}
	/** Inserts a new record into the given object store. */
	public async add<T>(storeName: string, value: any, key?: string | number): Promise<T> {
		const registeredTable = this.tableRegistry.get(storeName)
		const nextValue = registeredTable ? registeredTable.prepareCreate(value) : value
		const [executedWrite] = await this.storage.executeTransaction([
			{ type: "add", storeName, value: nextValue, key },
		])
		return executedWrite?.value as T
	}
	/** Partially updates an existing record in the given object store. */
	public async patch<T>(storeName: string, value: Partial<T>, key?: string | number): Promise<T> {
		const registeredTable = this.tableRegistry.get(storeName)
		const nextValue = registeredTable ? registeredTable.preparePatch(value as never) : value
		await this.storage.executeTransaction([{ type: "patch", storeName, value: nextValue, key }])
		return nextValue as T
	}
	/** Upserts a record into the given object store. */
	public async put<T>(storeName: string, value: any, key?: string | number): Promise<T> {
		const registeredTable = this.tableRegistry.get(storeName)
		const nextValue = registeredTable ? registeredTable.preparePut(value) : value
		const [executedWrite] = await this.storage.executeTransaction([
			{ type: "put", storeName, value: nextValue, key },
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
