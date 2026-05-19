import type { DbSyncConfig } from "../../DbSync.js"
import { promiseWithResolvers } from "../../util/promises.js"
import type { EventBus } from "../EventBus.js"

type TableDefaults = {
	/** Callback that fills in default fields before a write is persisted. */
	defaultSetter?: (value: any) => any
}

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
	key?: string | number
}

type WriteOperation = {
	type: string
	storeName: string
	value?: any
	key?: string | number
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

		// Pre-fetch objects for patch operations using a separate read-only transaction.
		// A standard IndexedDB transaction auto-commits if we await inside it, so we must
		// gather everything into memory synchronously before opening the main readwrite transaction.
		const patchOperations = operations.filter((op) => op.type === "patch")
		const patchRecords: Record<string, any> = {}

		if (patchOperations.length > 0) {
			const preTx = db.transaction(storeNames, "readonly")
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

		// Now execute the actual write bundle synchronously.
		const { promise, resolve, reject } = promiseWithResolvers<ExecutedWrite[]>()
		const tx = db.transaction(storeNames, "readwrite")
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
}
