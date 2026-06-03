import { createUid } from "@slimr/util"
import type { BackendAdapter } from "./adapters/types.js"
import type { DbSyncConfig, DbSyncDebugEvent, DbSyncTableConfig } from "./dbSyncConfig.js"
import { emitDebug } from "./internal/debug.js"

export type {
	DbSyncConfig,
	DbSyncDebugEvent,
	DbSyncDebugListener,
	DbSyncDebugListeners,
	DbSyncTableConfig,
} from "./dbSyncConfig.js"

import { DbRepository } from "./DbRepository.js"
import { DbSyncAuth } from "./DbSyncAuth.js"
import { DbSyncSync } from "./DbSyncSync.js"
import type { DbTable } from "./DbTable.js"
import { DbTxRepository } from "./DbTxRepository.js"
import type { DbSyncLikeType } from "./dbSyncLikeType.js"
import { AuthManager } from "./internal/AuthManager.js"
import { AuthObservables } from "./internal/AuthObservables.js"
import { ConnectivityTracker } from "./internal/ConnectivityTracker.js"
import { type DbUpdatesPayload, EventBus, type RowChange } from "./internal/EventBus.js"
import { type Migration, MigrationManager } from "./internal/MigrationManager.js"
import type { FindOptions } from "./internal/queryTypes.js"
import { SessionManager } from "./internal/SessionManager.js"
import { SyncEngine } from "./internal/SyncEngine.js"
import { SyncObservables } from "./internal/SyncObservables.js"
import { applyDefaults, StorageManager } from "./internal/storage/index.js"
import { resolveLifecyclePolicy } from "./lifecycle.js"
import type { TransactionOf } from "./transactionTypes.js"

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
	private _auth!: DbSyncAuth
	private _sync!: DbSyncSync

	/** Authentication actions and session read accessors (`phase`, `isLoggedIn`, `phase$`, …). */
	get auth(): DbSyncAuth {
		return this._auth
	}

	/** Background sync controls and status. */
	get sync(): DbSyncSync {
		return this._sync
	}
	/** Runtime-registered table instances for class-based schemas. */
	private tableRegistry = new Map<string, DbTable<any, any>>()

	/** The event bus used for local and cross-tab notifications. */
	private events: EventBus
	/** The storage manager handling IndexedDB state and transactions. */
	private storage: StorageManager
	/** The engine responsible for network synchronization. */
	private syncEngine: SyncEngine
	/** Tracks browser online/offline state. */
	private connectivity: ConnectivityTracker
	/** The manager handling authentication and logout behavior. */
	private authManager: AuthManager
	/** Whether an automatic boot microtask is already queued. */
	private autoBootScheduled = false
	/** Whether the consumer opted into manual lifecycle (`boot()` allowed). */
	private lifecycleManual: boolean
	/** Short id for observable debug names (multiple instances per page). */
	private readonly instanceId: string

	/**
	 * Creates a new `DbSync` instance using the supplied configuration.
	 *
	 * @param config The backend adapter, schema version, and table definitions.
	 */
	constructor(config: DbSyncConfig) {
		this.config = config
		const adapter = config.adapter
		const policy = resolveLifecyclePolicy(adapter, config)
		this.lifecycleManual = policy.manual

		this.instanceId = createUid().slice(0, 8)
		this.events = new EventBus(this.instanceId)
		const authObservables = new AuthObservables(this.instanceId)
		const syncObservables = new SyncObservables(this.instanceId)

		const onSchemaChange = () => this.onSchemaChangeDetected()

		this.storage = new StorageManager(config, this.events, onSchemaChange, () =>
			this.getSchemaTables().map((table) => ({
				storeName: table.tableName,
				indexes: table.indexes,
			})),
		)

		this.connectivity = new ConnectivityTracker()
		this.authManager = new AuthManager(
			adapter,
			this.storage,
			this.events,
			this.connectivity,
			() => {
				this.sync.stop()
			},
			config.events,
			() => this.storage.initted,
		)
		this.syncEngine = new SyncEngine(
			config,
			() => this.syncInterval,
			this.events,
			this.storage,
			this.authManager,
			this.connectivity,
			adapter,
			onSchemaChange,
			() => this.getSchemaTables(),
		)

		const sessionManager = new SessionManager(
			this.authManager,
			() => this.storage.initted,
			this.connectivity,
			this.syncEngine,
			this.events,
			authObservables,
			syncObservables,
			adapter.requiresAuth !== false,
		)

		this._sync = new DbSyncSync(
			{
				assertAuthenticated: () => this.authManager.assertAuthenticated(),
				ensureReady: () => this.ensureStorageReady(),
			},
			this.syncEngine,
			this.events,
			this.authManager,
			authObservables,
			sessionManager,
			syncObservables,
		)
		this._auth = new DbSyncAuth(this.authManager, sessionManager, authObservables)
		void sessionManager.publish()

		if (policy.autoStart) {
			this.authManager.onSessionStart(async () => {
				await this.sync.start()
			})
		}

		if (policy.autoBoot) {
			this.scheduleAutoBoot()
		}

		for (const tableName of Object.keys(config.tables ?? {})) {
			;(this as Record<string, unknown>)[tableName] = new DbRepository(this, tableName)
		}

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

	/** Opens IndexedDB and runs schema migrations (requires authenticated session when `requiresAuth`). */
	private async ensureStorageReady() {
		this.authManager.assertAuthenticated()
		if (this.storage.initted) return
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
	public getTransaction(this: DbSyncLikeType): TransactionOf<this> {
		const db = this as DbSync
		db.authManager.assertAuthenticated()
		const tx = db.storage.getTransaction()
		const txWithTables = tx as unknown as Record<string, unknown>
		for (const table of db.getSchemaTables()) {
			txWithTables[table.tableName] = new DbTxRepository(tx, table.tableName, table)
		}
		return tx as TransactionOf<this>
	}

	private assertDataAccess() {
		this.authManager.assertAuthenticated()
	}

	/** Reads a typed record by primary key. */
	public async get<T>(tableName: string, id: string): Promise<T | undefined> {
		this.assertDataAccess()
		return this.storage.get<T>(tableName, id)
	}
	/**
	 * Reads records matching a query from the given table.
	 *
	 * - with no options, this returns every record from the table.
	 * - limit+order=desc is not well-supported in IndexedDB and must use the more costly cursor read approach
	 */
	public find<T, const O extends FindOptions | undefined = undefined>(
		tableName: string,
		options?: O,
	) {
		this.assertDataAccess()
		return this.storage.find<T, O>(tableName, options)
	}
	/** Reads the first record matching an index/value pair. */
	public async getBy<T>(
		tableName: string,
		indexName: string,
		value: string | number,
	): Promise<T | undefined> {
		this.assertDataAccess()
		return this.storage.getBy<T>(tableName, indexName, value)
	}
	/**
	 * Streams records matching a query from the given table.
	 * If no options are provided, returns every record from the table.
	 */
	public stream<T, const O extends FindOptions | undefined = undefined>(
		tableName: string,
		options?: O,
	) {
		this.assertDataAccess()
		return this.storage.stream<T, O>(tableName, options)
	}
	/** Inserts a new record into the given table. */
	public async add<T>(tableName: string, value: any, key?: string): Promise<T> {
		this.assertDataAccess()
		const registeredTable = this.tableRegistry.get(tableName)
		const nextValue = registeredTable ? registeredTable.prepareCreate(value) : value
		const [executedWrite] = await this.storage.executeTransaction([
			{ type: "add", storeName: tableName, value: nextValue, key },
		])
		return executedWrite?.value as T
	}
	/** Partially updates an existing record in the given table. */
	public async patch<T>(tableName: string, value: Partial<T>, key?: string): Promise<T> {
		this.assertDataAccess()
		const registeredTable = this.tableRegistry.get(tableName)
		const nextValue = registeredTable ? registeredTable.preparePatch(value as never) : value
		await this.storage.executeTransaction([
			{ type: "patch", storeName: tableName, value: nextValue, key },
		])
		return nextValue as T
	}
	/** Upserts a record into the given table. */
	public async put<T>(tableName: string, value: any, key?: string): Promise<T> {
		this.assertDataAccess()
		const registeredTable = this.tableRegistry.get(tableName)
		const nextValue = registeredTable ? registeredTable.preparePut(value) : value
		const [executedWrite] = await this.storage.executeTransaction([
			{ type: "put", storeName: tableName, value: nextValue, key },
		])
		return executedWrite?.value as T
	}
	/** Deletes a record from the given table. */
	public async delete(tableName: string, key: string): Promise<void> {
		this.assertDataAccess()
		await this.storage.executeTransaction([{ type: "delete", storeName: tableName, key }])
	}
	/** Clears all records from the given table. */
	public async clear(tableName: string): Promise<void> {
		this.assertDataAccess()
		await this.storage.executeTransaction([{ type: "clear", storeName: tableName }])
	}

	/** Observable stream of table updates (local and cross-tab). */
	get updates$() {
		return this.events.updates$
	}

	/**
	 * Waits until the boot pipeline completes (session replay and internal `sync.start()` when logged in).
	 * Idempotent — shares the run scheduled on a microtask when lifecycle is automatic.
	 * Does not run `auth.onAuthenticated` on refresh. Does not wait for backend sync.
	 */
	public async waitForBooted(): Promise<void> {
		return this.authManager.boot()
	}

	/**
	 * Kicks local startup when `lifecycle.manual` is true. Otherwise use `waitForBooted()`.
	 */
	public async boot(): Promise<void> {
		if (!this.lifecycleManual) {
			throw new Error("dbsync: boot() is only for lifecycle.manual — use waitForBooted()")
		}
		return this.authManager.boot()
	}

	/** Queues boot on the next microtask when automatic lifecycle is enabled. */
	private scheduleAutoBoot() {
		if (this.autoBootScheduled) return
		this.autoBootScheduled = true
		queueMicrotask(() => {
			this.autoBootScheduled = false
			void this.authManager.boot()
		})
	}

	/** Emits a debug event when `config.events` is set. */
	public emitDebug(event: DbSyncDebugEvent) {
		emitDebug(this.config.events, event)
	}

	/** Responds to schema changes by disposing state and reloading the page. */
	protected onSchemaChangeDetected() {
		emitDebug(this.config.events, { type: "schema:reload" })
		this.storage.dispose()
		this.sync.stop()
		if (typeof window !== "undefined") {
			window.location.reload()
		}
	}

	/** Disposes all background resources and event listeners. */
	public dispose() {
		this.sync.stop()
		this.events.dispose()
		this.storage.dispose()
	}
}

export type { DbUpdatesPayload, RowChange }
