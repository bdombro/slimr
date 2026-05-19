import { createUid } from "@slimr/util"
import type { BackendAdapter } from "./adapters/types.js"
import type { FindOptions } from "./DbRepository.js"
import { DbRepository } from "./DbRepository.js"
import type { DbTable } from "./DbTable.js"
import { DbTxRepository } from "./DbTxRepository.js"
import { AuthManager } from "./internal/AuthManager.js"
import {
	EventBus,
	type RowChange,
	type SubscribeCallback,
	type SyncState,
} from "./internal/EventBus.js"
import { MigrationManager, type MigrationManagerMigration } from "./internal/MigrationManager.js"

type Migration = MigrationManagerMigration

import { SyncEngine } from "./internal/SyncEngine.js"
import { applyDefaults, StorageManager } from "./internal/storage/index.js"

export interface DbSyncTableConfig {
	/** Optional index names to create for the table. */
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
	/** The tables and their index definitions. */
	tables?: Record<string, DbSyncTableConfig>
}

interface DbSyncResolvedTable {
	tableName: string
	indexes?: string[]
	migrations?: Migration[]
	prepareCreate?: (value: any) => any
	preparePut?: (value: any) => any
	preparePatch?: (value: any) => any
}

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

		this.storage = new StorageManager(config, this.events, onSchemaChange, () =>
			this.getSchemaTables().map((table) => ({
				storeName: table.tableName,
				indexes: table.indexes,
			})),
		)

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

		for (const tableName of Object.keys(config.tables ?? {})) {
			;(this as Record<string, unknown>)[tableName] = new DbRepository(this, tableName)
		}

		// Return a Proxy interceptor so that subclasses declaring typed table properties
		// (e.g. `todos!: DbRepository<Todo>`) do not overwrite the repositories with `undefined`
		// when their field initializers run.
		const knownTables = config.tables ?? {}
		// biome-ignore lint/correctness/noConstructorReturn: the constructor intentionally returns a Proxy
		return new Proxy(this, {
			defineProperty(target, prop, desc) {
				if (typeof prop === "string" && prop in knownTables && desc.value === undefined) {
					return true
				}
				return Reflect.defineProperty(target, prop, desc)
			},
		})
	}

	/** Registers a runtime table instance and makes it available to schema-aware helpers. */
	public registerTable(table: DbTable<any, any>) {
		this.tableRegistry.set(table.tableName, table)
		if (!(table.tableName in this)) {
			;(this as Record<string, unknown>)[table.tableName] = table
		}
	}

	/** Resolves the active table definitions from static config and runtime registrations. */
	private getSchemaTables(): DbSyncResolvedTable[] {
		const resolvedTables = new Map<string, DbSyncResolvedTable>()

		for (const [tableName, tableConfig] of Object.entries(this.config.tables ?? {})) {
			resolvedTables.set(tableName, {
				tableName: tableName,
				indexes: tableConfig.indexes?.slice(),
				migrations: tableConfig.migrations?.slice(),
				prepareCreate: (value) => applyDefaults(tableConfig, value),
				preparePut: (value) => applyDefaults(tableConfig, value),
				preparePatch: (value) => value,
			})
		}

		for (const table of this.tableRegistry.values()) {
			const tableConstructor = table.constructor as { indexes?: string[]; migrations?: Migration[] }
			resolvedTables.set(table.tableName, {
				tableName: table.tableName,
				indexes: tableConstructor.indexes?.slice(),
				migrations: tableConstructor.migrations?.slice(),
				prepareCreate: (value) => table.prepareCreate(value),
				preparePut: (value) => table.preparePut(value),
				preparePatch: (value) => table.preparePatch(value),
			})
		}

		return [...resolvedTables.values()].sort((left, right) =>
			left.tableName.localeCompare(right.tableName),
		)
	}

	/** Resolves a single table definition by table name, if one exists. */
	private getSchemaTable(tableName: string) {
		return this.getSchemaTables().find((table) => table.tableName === tableName)
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
				schemaMigrations[table.tableName] = table.migrations
				hasMigrations = true
			}
		}

		if (hasMigrations) {
			const migrationManager = new MigrationManager(this)
			await migrationManager.runAll(schemaMigrations)
		}
	}
	/** Applies the configured migrations for a single table to the provided record. */
	public async upgradeRecord<T extends Record<string, any>>(
		tableName: string,
		record: T,
	): Promise<T> {
		const migrations = this.getSchemaTable(tableName)?.migrations || []
		if (migrations.length === 0) {
			return record
		}

		const upgradedRecord = { ...record }
		await MigrationManager.upgradeRecord(upgradedRecord, migrations)
		return upgradedRecord as T
	}
	/** Applies the configured defaultSetter/defaulting logic for a single table without persisting. */
	public applyDefaults<T extends Record<string, any>>(tableName: string, record: T): T {
		const registeredTable = this.tableRegistry.get(tableName)
		if (registeredTable) {
			return registeredTable.prepareCreate(record) as T
		}
		return applyDefaults(this.config.tables?.[tableName], record)
	}
	/** Returns a queued transaction object for batched writes. */
	public getTransaction() {
		const tx = this.storage.getTransaction()
		const txWithTables = tx as unknown as Record<string, unknown>
		for (const table of this.getSchemaTables()) {
			txWithTables[table.tableName] = new DbTxRepository(tx, table.tableName, table)
		}
		return tx
	} // Exported temporarily for tests

	/** Reads a typed record by primary key. */
	public async get<T>(tableName: string, id: string): Promise<T | undefined> {
		return this.storage.get<T>(tableName, id)
	}
	/**
	 * Reads records matching a query from the given table.
	 *
	 * - with no options, this returns every record from the table.
	 * - limit+order=desc is not well-supported in IndexedDB and must use the more costly cursor read approach
	 */
	public async find<T>(tableName: string, options: FindOptions = {}): Promise<T[]> {
		return this.storage.find<T>(tableName, options)
	}
	/** Reads the first record matching an index/value pair. */
	public async getBy<T>(
		tableName: string,
		indexName: string,
		value: string | number,
	): Promise<T | undefined> {
		return this.storage.getBy<T>(tableName, indexName, value)
	}
	/**
	 * Streams records matching a query from the given table.
	 * If no options are provided, returns every record from the table.
	 */
	public stream<T>(tableName: string, options: FindOptions = {}): AsyncGenerator<T> {
		return this.storage.stream<T>(tableName, options)
	}
	/** Inserts a new record into the given table. */
	public async add<T>(tableName: string, value: any, key?: string): Promise<T> {
		const registeredTable = this.tableRegistry.get(tableName)
		const nextValue = registeredTable ? registeredTable.prepareCreate(value) : value
		const [executedWrite] = await this.storage.executeTransaction([
			{ type: "add", storeName: tableName, value: nextValue, key },
		])
		return executedWrite?.value as T
	}
	/** Partially updates an existing record in the given table. */
	public async patch<T>(tableName: string, value: Partial<T>, key?: string): Promise<T> {
		const registeredTable = this.tableRegistry.get(tableName)
		const nextValue = registeredTable ? registeredTable.preparePatch(value as never) : value
		await this.storage.executeTransaction([
			{ type: "patch", storeName: tableName, value: nextValue, key },
		])
		return nextValue as T
	}
	/** Upserts a record into the given table. */
	public async put<T>(tableName: string, value: any, key?: string): Promise<T> {
		const registeredTable = this.tableRegistry.get(tableName)
		const nextValue = registeredTable ? registeredTable.preparePut(value) : value
		const [executedWrite] = await this.storage.executeTransaction([
			{ type: "put", storeName: tableName, value: nextValue, key },
		])
		return executedWrite?.value as T
	}
	/** Deletes a record from the given table. */
	public async delete(tableName: string, key: string): Promise<void> {
		await this.storage.executeTransaction([{ type: "delete", storeName: tableName, key }])
	}
	/** Clears all records from the given table. */
	public async clear(tableName: string): Promise<void> {
		await this.storage.executeTransaction([{ type: "clear", storeName: tableName }])
	}

	/** Subscribes to table update notifications. */
	public subscribe(callback: SubscribeCallback) {
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
