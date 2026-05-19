import type { FindOptions } from "../../DbRepository.js"
import type { DbSyncConfig } from "../../DbSync.js"
import { promiseWithResolvers } from "../../util/promises.js"
import { DbTransaction } from "../DbTransaction.js"
import type { EventBus, RowChange } from "../EventBus.js"
import { QueryEngine } from "../QueryEngine.js"
import { getSchemaSignature } from "./SchemaSignature.js"
import { WriteEngine } from "./WriteEngine.js"

type SchemaTable = {
	storeName: string
	indexes?: string[]
}

/**
 * Owns IndexedDB initialization, transactions, and record access.
 */
export class StorageManager {
	/** The active IndexedDB database instance. */
	public db!: IDBDatabase
	/** Whether the storage layer has finished initializing. */
	public initted = false
	/** The IndexedDB database name used by dbsync. */
	private dbName = "dbsync"
	/** Query planner/executor used for read paths. */
	private queryEngine: QueryEngine
	/** Write planner/executor used for batched mutations. */
	private writeEngine: WriteEngine

	/**
	 * Creates a storage manager for the provided dbsync configuration and event bus.
	 *
	 * @param config The full dbsync configuration object.
	 * @param events The event bus used to broadcast store updates.
	 * @param onSchemaChange Callback fired when the IndexedDB schema changes.
	 */
	constructor(
		private config: DbSyncConfig,
		private events: EventBus,
		private onSchemaChange: () => void,
		private getSchemaTables: () => SchemaTable[],
	) {
		this.queryEngine = new QueryEngine(() => this.db, this.getSchemaTables)
		this.writeEngine = new WriteEngine(config, this.events, () => this.db)
	}

	/** Computes a deterministic schema signature from the configured tables and indexes. */
	private get schemaSignature() {
		return getSchemaSignature(this.getSchemaTables(), "storeName")
	}

	/** Creates a transaction wrapper used by the sync engine and public facade. */
	public getTransaction() {
		return new DbTransaction(async (operations) => {
			await this.executeTransaction(operations)
		})
	}

	/** Opens IndexedDB and creates the configured stores when needed. */
	public async init() {
		const { promise, resolve, reject } = promiseWithResolvers<void>()

		const upgradeFn = (e: IDBVersionChangeEvent) => {
			const db = (e.target as IDBOpenDBRequest).result
			this.getSchemaTables().forEach((table) => {
				let store: IDBObjectStore
				if (!db.objectStoreNames.contains(table.storeName)) {
					store = db.createObjectStore(table.storeName, { keyPath: "id" })
				} else {
					store = (e.target as IDBOpenDBRequest).transaction!.objectStore(table.storeName)
				}

				if (table.indexes) {
					table.indexes.forEach((idx) => {
						if (!Array.from(store.indexNames ?? []).includes(idx)) {
							store.createIndex(idx, idx, { unique: false })
						}
					})
				}
			})
			if (!db.objectStoreNames.contains("dirtyQueue"))
				db.createObjectStore("dirtyQueue", { keyPath: "id" })
			if (!db.objectStoreNames.contains("deletedQueue"))
				db.createObjectStore("deletedQueue", { keyPath: "id" })
		}

		let localDbVersion = this.config.version
		if (localDbVersion === undefined) {
			const storedVersion = Number(localStorage.getItem("dbsync-db-version") || "1")
			const currentSignature = this.schemaSignature
			const storedSignature = localStorage.getItem("dbsync-schema-signature")

			if (storedSignature !== currentSignature) {
				localDbVersion = storedVersion + 1
				localStorage.setItem("dbsync-schema-signature", currentSignature)
				localStorage.setItem("dbsync-db-version", String(localDbVersion))
			} else {
				localDbVersion = storedVersion
			}
		}

		const req = indexedDB.open(this.dbName, localDbVersion)
		req.onupgradeneeded = upgradeFn
		req.onsuccess = (e) => {
			this.db = (e.target as IDBOpenDBRequest).result
			this.db.onversionchange = () => this.onSchemaChange()
			this.initted = true
			resolve()
		}
		req.onerror = () => reject(req.error)
		return promise
	}

	/** Executes a batch of writes inside a single IndexedDB transaction. */
	public async executeTransaction(operations: any[]) {
		return this.writeEngine.executeTransaction(operations)
	}

	/** Reads a typed record by primary key from the requested store. */
	public async get<T>(storeName: string, id: string | number): Promise<T | undefined> {
		const { promise, resolve, reject } = promiseWithResolvers<T | undefined>()
		const tx = this.db.transaction(storeName, "readonly")
		const req = tx.objectStore(storeName).get(id)
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
		return promise
	}

	/** Returns records matching a query from the requested store. */
	public async find<T>(storeName: string, options: FindOptions = {}): Promise<T[]> {
		return this.queryEngine.find<T>(storeName, options)
	}

	/** Returns the first record matching an index/value pair, if any. */
	public async getBy<T>(
		storeName: string,
		indexName: string,
		value: string | number,
	): Promise<T | undefined> {
		return this.queryEngine.getBy<T>(storeName, indexName, value)
	}

	/** Streams records matching a query from the requested store. */
	public stream<T>(storeName: string, options: FindOptions = {}): AsyncGenerator<T> {
		return this.queryEngine.stream<T>(storeName, options)
	}

	/** Clears every object store managed by the database. */
	public async clearAllStores() {
		const storeNames = Array.from(this.db.objectStoreNames)
		const tx = this.db.transaction(storeNames, "readwrite")
		storeNames.forEach((name) => tx.objectStore(name).clear())
		return new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => {
				const userStores = storeNames.filter(
					(name) => name !== "dirtyQueue" && name !== "deletedQueue",
				)
				const changes: RowChange[] = userStores.map((table) => ({
					table,
					change: "clear",
				}))
				this.events.notifySubscribers(storeNames, changes)
				resolve()
			}
			tx.onerror = () => reject(tx.error)
		})
	}

	/** Closes the underlying IndexedDB connection. */
	public dispose() {
		if (this.db) {
			this.db.close()
		}
	}
}
