import type { DbSyncConfig } from "../../DbSync.js"
import { promiseWithResolvers } from "../../util/promises.js"
import type { EventBus, RowChange } from "../EventBus.js"

type TableDefaults = {
	/** Callback that fills in default fields before a write is persisted. */
	defaultSetter?: (value: any) => any
}

/** Internal queue stores excluded from row-level change notifications. */
const INTERNAL_STORES = new Set(["dirtyQueue", "deletedQueue"])

/** Applies a table's defaultSetter logic to a shallow copy without mutating the original input. */
export const applyDefaults = <T>(tableConfig: TableDefaults | undefined, value: T): T => {
	const nextValue = { ...value }
	return (tableConfig?.defaultSetter?.(nextValue) ?? nextValue) as T
}

/** Captures the final payload written for a single store operation after defaults and patches are applied. */
export type ExecutedWrite = {
	/** The operation that was executed. */
	type: string
	/** The store the operation targeted. */
	storeName: string
	/** The final value written to IndexedDB, if applicable. */
	value?: any
	/** The record key used for the write, if one was present. */
	key?: string
}

/** A single queued write applied inside one IndexedDB transaction. */
export type WriteOperation = {
	type: string
	storeName: string
	value?: any
	key?: string
	/** When true, apply to user stores without enqueueing dirty/deleted queues (e.g. sync pull). */
	skipQueue?: boolean
}

/** Accumulates deduplicated row changes for a single transaction. */
class RowChangeAccumulator {
	private clearedTables = new Set<string>()
	private changesByKey = new Map<string, RowChange>()

	/** Records a row-level change, applying clear-vs-row deduplication rules. */
	public add(change: RowChange) {
		if (INTERNAL_STORES.has(change.table)) return

		if (change.change === "clear") {
			this.clearedTables.add(change.table)
			for (const key of this.changesByKey.keys()) {
				if (key.startsWith(`${change.table}:`)) {
					this.changesByKey.delete(key)
				}
			}
			this.changesByKey.set(`${change.table}:clear`, change)
			return
		}

		if (this.clearedTables.has(change.table)) return
		this.changesByKey.set(`${change.table}:${change.id}`, change)
	}

	/** Returns the deduplicated row changes for this transaction. */
	public toArray(): RowChange[] {
		return Array.from(this.changesByKey.values())
	}
}

/** Loads primary keys for every record in a store (used before clear enqueues tombstones). */
const loadStoreRecordIds = (db: IDBDatabase, storeName: string): Promise<string[]> => {
	const { promise, resolve, reject } = promiseWithResolvers<string[]>()
	const preTx = db.transaction([storeName], "readonly")
	const getAllReq = preTx.objectStore(storeName).getAll()
	getAllReq.onsuccess = () => {
		const ids = (getAllReq.result ?? [])
			.map((record) => record?.id)
			.filter((id): id is string => typeof id === "string" && id.length > 0)
		resolve(ids)
	}
	getAllReq.onerror = () => reject(getAllReq.error)
	return promise
}

/** Maps a write operation type to a row change kind. */
const toRowChangeKind = (type: string): "insert" | "update" | "delete" | "clear" | undefined => {
	switch (type) {
		case "add":
			return "insert"
		case "put":
		case "patch":
			return "update"
		case "delete":
			return "delete"
		case "clear":
			return "clear"
		default:
			return undefined
	}
}

/** Owns write batching, patch prefetching, and queue bookkeeping for IndexedDB transactions. */
export class WriteEngine {
	constructor(
		private config: DbSyncConfig,
		private events: EventBus,
		private getDb: () => IDBDatabase,
	) {}

	/** Executes a batch of writes inside a single IndexedDB transaction. */
	public async executeTransaction(operations: WriteOperation[]): Promise<ExecutedWrite[]> {
		const db = this.getDb()
		const storeNames = Array.from(new Set(operations.map((o) => o.storeName))).concat([
			"dirtyQueue",
			"deletedQueue",
		])
		const executedWrites: ExecutedWrite[] = []
		const rowChanges = new RowChangeAccumulator()

		// Pre-fetch objects for patch operations using a separate read-only transaction.
		// A standard IndexedDB transaction auto-commits if we await inside it, so we must
		// gather everything into memory synchronously before opening the main readwrite transaction.
		const patchOperations = operations.filter((op) => op.type === "patch")
		const patchRecords: Record<string, any> = {}
		const skippedPatchKeys = new Set<string>()

		if (patchOperations.length > 0) {
			const preTx = db.transaction(storeNames, "readonly")
			const fetchPromises = patchOperations.map(async (op) => {
				const recordId = op.key || op.value?.id
				const { promise: p, resolve: r, reject: rej } = promiseWithResolvers<any>()
				const getReq = preTx.objectStore(op.storeName).get(recordId)
				getReq.onsuccess = () => r(getReq.result)
				getReq.onerror = () => rej(getReq.error)
				const existingRecord = await p

				if (!existingRecord) {
					console.warn(`[dbsync]: Skipping patch for deleted record ${recordId} in ${op.storeName}`)
					skippedPatchKeys.add(`${op.storeName}-${recordId}`)
					return
				}
				patchRecords[`${op.storeName}-${recordId}`] = existingRecord
			})
			await Promise.all(fetchPromises)
		}

		const clearOperations = operations.filter(
			(op) => op.type === "clear" && !op.skipQueue && !INTERNAL_STORES.has(op.storeName),
		)
		const clearPrefetchedIds: Record<string, string[]> = {}
		if (clearOperations.length > 0) {
			const clearStoreNames = Array.from(new Set(clearOperations.map((op) => op.storeName)))
			await Promise.all(
				clearStoreNames.map(async (storeName) => {
					clearPrefetchedIds[storeName] = await loadStoreRecordIds(db, storeName)
				}),
			)
		}

		// Now execute the actual write bundle synchronously.
		const { promise, resolve, reject } = promiseWithResolvers<ExecutedWrite[]>()
		const tx = db.transaction(storeNames, "readwrite")
		tx.oncomplete = () => {
			const changes = rowChanges.toArray()
			this.events.notifySubscribers(storeNames, changes.length > 0 ? changes : undefined)
			resolve(executedWrites)
		}
		tx.onerror = () => reject(tx.error)

		const batchIdsByStore = new Map<string, Set<string>>()

		operations.forEach((op) => {
			const store = tx.objectStore(op.storeName)
			let payloadToWrite = op.value
			let recordId: string | undefined = op.key ?? op.value?.id
			const changeKind = toRowChangeKind(op.type)

			if (op.type === "patch" && skippedPatchKeys.has(`${op.storeName}-${recordId}`)) {
				return
			}

			if (op.type === "put" || op.type === "add" || op.type === "patch") {
				if (op.type === "put" || op.type === "add") {
					if (!op.skipQueue) {
						payloadToWrite = applyDefaults(this.config.tables?.[op.storeName], payloadToWrite)
					}
					recordId = op.key ?? payloadToWrite?.id
				} else if (op.type === "patch") {
					const existingRecord = patchRecords[`${op.storeName}-${recordId}`]
					payloadToWrite = { ...existingRecord, ...op.value }
					recordId = op.key ?? payloadToWrite?.id
				}

				store.put(payloadToWrite)
				executedWrites.push({
					type: op.type,
					storeName: op.storeName,
					value: payloadToWrite,
					key: recordId,
				})
				if (changeKind && changeKind !== "clear" && recordId) {
					rowChanges.add({
						table: op.storeName,
						change: changeKind,
						id: recordId,
					})
				}
				if (!op.skipQueue && op.storeName !== "dirtyQueue" && op.storeName !== "deletedQueue") {
					tx.objectStore("dirtyQueue").put({
						id: recordId,
						table: op.storeName,
						payload: payloadToWrite,
						timestamp: Date.now(),
					})
					if (recordId) {
						let batchIds = batchIdsByStore.get(op.storeName)
						if (!batchIds) {
							batchIds = new Set()
							batchIdsByStore.set(op.storeName, batchIds)
						}
						batchIds.add(recordId)
					}
				}
			} else if (op.type === "delete") {
				if (!recordId) {
					throw new Error(`[dbsync]: Cannot delete record in ${op.storeName} without an id`)
				}
				store.delete(recordId)
				if (changeKind && changeKind !== "clear") {
					rowChanges.add({
						table: op.storeName,
						change: changeKind,
						id: recordId,
					})
				}
				if (!op.skipQueue && op.storeName !== "dirtyQueue" && op.storeName !== "deletedQueue") {
					tx.objectStore("deletedQueue").put({
						id: recordId,
						table: op.storeName,
						timestamp: Date.now(),
					})
					tx.objectStore("dirtyQueue").delete(recordId)
					batchIdsByStore.get(op.storeName)?.delete(recordId)
				}
			} else if (op.type === "clear") {
				if (!op.skipQueue && op.storeName !== "dirtyQueue" && op.storeName !== "deletedQueue") {
					const idsToDelete = new Set([
						...(clearPrefetchedIds[op.storeName] ?? []),
						...(batchIdsByStore.get(op.storeName) ?? []),
					])
					const deletedStore = tx.objectStore("deletedQueue")
					const dirtyStore = tx.objectStore("dirtyQueue")
					const timestamp = Date.now()
					for (const id of idsToDelete) {
						deletedStore.put({
							id,
							table: op.storeName,
							timestamp,
						})
						dirtyStore.delete(id)
					}
					batchIdsByStore.delete(op.storeName)
				}
				store.clear()
				if (changeKind === "clear") {
					rowChanges.add({ table: op.storeName, change: "clear" })
				}
			}
		})

		return promise
	}
}
