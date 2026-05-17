import type { DbTransaction } from "./internal/DbTransaction.js"

/**
 * A typed repository wrapper for a single `DbTransaction` object store target.
 * Provides a localized interface to queue write operations with strict typings
 * to minimize boilerplate and enforce consistent data types for a specific table.
 */
export class DbTxRepository<T> {
	/**
	 * Initializes a new transaction repository tied to a specific object store.
	 *
	 * @param tx The active `DbTransaction` instance.
	 * @param storeName The name of the object store to queue writes for.
	 */
	constructor(
		protected tx: DbTransaction,
		public readonly storeName: string,
	) {}

	/**
	 * Queues an insertion operation.
	 *
	 * @param value The object payload to insert.
	 * @param key An optional explicit primary key.
	 */
	add(value: Partial<T>, key?: string | number): void {
		this.tx.add(this.storeName, value, key)
	}

	/**
	 * Queues an upsert (insert or update) operation.
	 *
	 * @param value The complete object to upsert.
	 * @param key An optional explicit primary key.
	 */
	put(value: T, key?: string | number): void {
		this.tx.put(this.storeName, value, key)
	}

	/**
	 * Queues a deletion operation.
	 *
	 * @param key The primary key of the record to delete.
	 */
	delete(key: string | number): void {
		this.tx.delete(this.storeName, key)
	}

	/**
	 * Queues an operation to remove all records from the object store.
	 */
	clear(): void {
		this.tx.clear(this.storeName)
	}
}
