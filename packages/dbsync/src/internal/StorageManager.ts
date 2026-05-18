import type { DbSyncConfig } from "../DbSync.js"
import type { FindOptions } from "../DbRepository.js"
import { promiseWithResolvers } from "../util/promiseWithResolvers.js"
import { DbTransaction } from "./DbTransaction.js"
import type { EventBus } from "./EventBus.js"

type SchemaTable = {
	storeName: string
	indexes?: string[]
}

type TableDefaults = {
	/** Callback that fills in default fields before a write is persisted. */
	defaultSetter?: (value: any) => any
}

/** Applies a table's defaultSetter logic to a shallow copy without mutating the original input. */
export const applyDefaults = <T>(tableConfig: TableDefaults | undefined, value: T): T => {
	const nextValue = { ...value }
	return (tableConfig?.defaultSetter?.(nextValue) ?? nextValue) as T
}

/**
 * Captures the final payload written for a single store operation after defaults and patches are applied.
 */
type ExecutedWrite = {
	/** The operation that was executed. */
	type: string
	/** The store the operation targeted. */
	storeName: string
	/** The final value written to IndexedDB, if applicable. */
	value?: any
	/** The record key used for the write, if one was present. */
	key?: string | number
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
	) {}

	/** Computes a deterministic schema signature from the configured tables and indexes. */
	private get schemaSignature() {
		const tables = this.getSchemaTables()
			.slice()
			.sort((left, right) => left.storeName.localeCompare(right.storeName))
			.map((table) => {
				return {
					table: table.storeName,
					indexes: table.indexes?.slice().sort() || [],
				}
			})
		return JSON.stringify(tables)
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
				if (!db.objectStoreNames.contains(table.storeName)) {
					const store = db.createObjectStore(table.storeName, { keyPath: "id" })
					if (table.indexes) {
						table.indexes.forEach((idx) => store.createIndex(idx, idx, { unique: false }))
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
	public async executeTransaction(operations: any[]): Promise<ExecutedWrite[]> {
		const storeNames = Array.from(new Set(operations.map((o) => o.storeName))).concat([
			"dirtyQueue",
			"deletedQueue",
		])
		const executedWrites: ExecutedWrite[] = []

		// Pre-fetch objects for patch operations using a separate read-only transaction.
		// A standard IndexedDB transaction auto-commits if we await inside it, so we must
		// gather everything into memory synchronously before opening the main readwrite transaction.
		const patchOperations = operations.filter((o) => o.type === "patch")
		const patchRecords: Record<string, any> = {}

		if (patchOperations.length > 0) {
			const preTx = this.db.transaction(storeNames, "readonly")
			const fetchPromises = patchOperations.map(async (op) => {
				const recordId = String(op.key || op.value?.id)
				const { promise: p, resolve: r, reject: rej } = promiseWithResolvers<any>()
				const getReq = preTx.objectStore(op.storeName).get(recordId)
				getReq.onsuccess = () => r(getReq.result)
				getReq.onerror = () => rej(getReq.error)
				const existingRecord = await p

				if (!existingRecord) {
					throw new Error(
						`[dbsync]: Cannot patch record ${recordId} in ${op.storeName} because it doesn't exist`,
					)
				}
				patchRecords[`${op.storeName}-${recordId}`] = existingRecord
			})
			await Promise.all(fetchPromises)
		}

		// Now execute the actual write bundle synchronously
		const { promise, resolve, reject } = promiseWithResolvers<ExecutedWrite[]>()
		const tx = this.db.transaction(storeNames, "readwrite")
		tx.oncomplete = () => {
			this.events.notifySubscribers(storeNames)
			resolve(executedWrites)
		}
		tx.onerror = () => reject(tx.error)

		operations.forEach((op) => {
			const store = tx.objectStore(op.storeName)
			let payloadToWrite = op.value
			let recordId = op.key || op.value?.id

			if (op.type === "put" || op.type === "add" || op.type === "patch") {
				if (op.type === "put" || op.type === "add") {
					payloadToWrite = applyDefaults(this.config.tables?.[op.storeName], payloadToWrite)
					recordId = op.key || payloadToWrite?.id
				} else if (op.type === "patch") {
					const existingRecord = patchRecords[`${op.storeName}-${recordId}`]
					payloadToWrite = { ...existingRecord, ...op.value }
					recordId = op.key || payloadToWrite?.id
				}

				store.put(payloadToWrite)
				executedWrites.push({
					type: op.type,
					storeName: op.storeName,
					value: payloadToWrite,
					key: recordId,
				})
				if (op.storeName !== "dirtyQueue" && op.storeName !== "deletedQueue") {
					tx.objectStore("dirtyQueue").put({
						id: recordId,
						table: op.storeName,
						payload: payloadToWrite,
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
	public async getAll<T>(storeName: string): Promise<T[]> {
		const { promise, resolve, reject } = promiseWithResolvers<T[]>()
		const tx = this.db.transaction(storeName, "readonly")
		const req = tx.objectStore(storeName).getAll()
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
		return promise
	}

	/** Returns records matching a query from the requested store. */
	public async find<T>(storeName: string, options: FindOptions = {}): Promise<T[]> {
		const records = await this.getAll<T>(storeName)
		const filtered = this.applyQuery(records, options)
		return this.applyOrderingAndLimit(filtered, options)
	}

	/** Returns the first record matching an index/value pair, if any. */
	public async getBy<T>(
		storeName: string,
		indexName: string,
		value: string | number,
	): Promise<T | undefined> {
		const results = await this.find<T>(storeName, { index: indexName, equals: value, limit: 1 })
		return results[0]
	}

	/** Streams records matching a query from the requested store. */
	public async *stream<T>(storeName: string, options: FindOptions = {}): AsyncGenerator<T> {
		for (const record of await this.find<T>(storeName, options)) {
			yield record
		}
	}

	/** Streams every record from the requested store. */
	public async *streamAll<T>(storeName: string): AsyncGenerator<T> {
		for (const record of await this.getAll<T>(storeName)) {
			yield record
		}
	}

	private applyQuery<T>(records: T[], options: FindOptions): T[] {
		if (
			options.index === undefined &&
			options.equals === undefined &&
			options.lowerBound === undefined &&
			options.upperBound === undefined
		) {
			return records
		}

		return records.filter((record) => {
			const candidate = (record as Record<string, any>)[options.index ?? "id"]
			if (options.equals !== undefined) return candidate === options.equals
			if (options.lowerBound !== undefined && candidate < options.lowerBound) return false
			if (options.upperBound !== undefined && candidate > options.upperBound) return false
			return true
		})
	}

	private applyOrderingAndLimit<T>(records: T[], options: FindOptions): T[] {
		const ordered = options.order === "desc" ? [...records].reverse() : records
		return options.limit === undefined ? ordered : ordered.slice(0, options.limit)
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
