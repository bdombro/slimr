import type { DbSyncConfig } from "../DbSync.js"
import { promiseWithResolvers } from "../util/promiseWithResolvers.js"
import { DbTransaction } from "./DbTransaction.js"
import type { EventBus } from "./EventBus.js"

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
	) {}

	/** Computes a deterministic schema signature from the configured tables and indexes. */
	private get schemaSignature() {
		const tables = Object.keys(this.config.tables)
			.sort()
			.map((table) => {
				return {
					table,
					indexes: this.config.tables[table].indexes?.slice().sort() || [],
				}
			})
		return JSON.stringify(tables)
	}

	/** Creates a transaction wrapper used by the sync engine and public facade. */
	public getTransaction() {
		return new DbTransaction((operations) => this.executeTransaction(operations))
	}

	/** Opens IndexedDB and creates the configured stores when needed. */
	public async init() {
		const { promise, resolve, reject } = promiseWithResolvers<void>()

		const upgradeFn = (e: IDBVersionChangeEvent) => {
			const db = (e.target as IDBOpenDBRequest).result
			Object.entries(this.config.tables).forEach(([tableName, config]) => {
				if (!db.objectStoreNames.contains(tableName)) {
					const store = db.createObjectStore(tableName, { keyPath: "id" })
					if (config.indexes) {
						config.indexes.forEach((idx) => store.createIndex(idx, idx, { unique: false }))
					}
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
	public async executeTransaction(operations: any[]): Promise<void> {
		const storeNames = Array.from(new Set(operations.map((o) => o.storeName))).concat([
			"dirtyQueue",
			"deletedQueue",
		])
		const { promise, resolve, reject } = promiseWithResolvers<void>()

		const tx = this.db.transaction(storeNames, "readwrite")
		tx.oncomplete = () => {
			this.events.notifySubscribers(storeNames)
			resolve()
		}
		tx.onerror = () => reject(tx.error)

		operations.forEach((op) => {
			const store = tx.objectStore(op.storeName)
			const recordId = op.key || op.value?.id

			if (op.type === "put" || op.type === "add") {
				store.put(op.value)
				if (op.storeName !== "dirtyQueue" && op.storeName !== "deletedQueue") {
					tx.objectStore("dirtyQueue").put({
						id: recordId,
						table: op.storeName,
						payload: op.value,
						timestamp: Date.now(),
					})
				}
			} else if (op.type === "delete") {
				store.delete(recordId)
				if (op.storeName !== "dirtyQueue" && op.storeName !== "deletedQueue") {
					tx.objectStore("deletedQueue").put({
						id: recordId,
						table: op.storeName,
						timestamp: Date.now(),
					})
					tx.objectStore("dirtyQueue").delete(recordId)
				}
			} else if (op.type === "clear") {
				store.clear()
			}
		})

		return promise
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

	/** Returns every record from the requested store. */
	public async findAll<T>(storeName: string): Promise<T[]> {
		const { promise, resolve, reject } = promiseWithResolvers<T[]>()
		const tx = this.db.transaction(storeName, "readonly")
		const req = tx.objectStore(storeName).getAll()
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
		return promise
	}

	/** Clears every object store managed by the database. */
	public async clearAllStores() {
		const tx = this.db.transaction(Array.from(this.db.objectStoreNames), "readwrite")
		Array.from(this.db.objectStoreNames).forEach((name) => tx.objectStore(name).clear())
		return new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve()
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
