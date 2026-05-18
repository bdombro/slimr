import type { DbTransaction } from "./internal/DbTransaction.js"

type PreparedWrite<Row, CreateInput> = {
	prepareCreate?: (value: CreateInput) => Row
	preparePut?: (value: Row) => Row
	preparePatch?: (value: Partial<Row> & { id: string }) => Partial<Row> & { id: string }
}

/**
 * A typed repository wrapper for a single `DbTransaction` object store target.
 * Provides a localized interface to queue write operations with strict typings
 * to minimize boilerplate and enforce consistent data types for a specific table.
 */
export class DbTxRepository<Row, CreateInput = Row> {
	/**
	 * Initializes a new transaction repository tied to a specific object store.
	 *
	 * @param tx The active `DbTransaction` instance.
	 * @param storeName The name of the object store to queue writes for.
	 */
	constructor(
		protected tx: DbTransaction,
		public readonly storeName: string,
		protected prepare?: PreparedWrite<Row, CreateInput>,
	) {}

	/**
	 * Queues an insertion operation.
	 *
	 * @param value The object payload to insert.
	 * @param key An optional explicit primary key.
	 */
	add(value: CreateInput, key?: string | number): void {
		const nextValue = this.prepare?.prepareCreate ? this.prepare.prepareCreate(value) : (value as unknown as Row)
		this.tx.add(this.storeName, nextValue, key)
	}

	/**
	 * Queues an upsert (insert or update) operation.
	 *
	 * @param value The complete object to upsert.
	 * @param key An optional explicit primary key.
	 */
	put(value: Row, key?: string | number): void {
		const nextValue = this.prepare?.preparePut ? this.prepare.preparePut(value) : value
		this.tx.put(this.storeName, nextValue, key)
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
	 * Queues a partial update operation for an existing record.
	 *
	 * @param value The object partial payload to patch.
	 * @param key An optional explicit primary key.
	 */
	patch(value: Partial<Row> & { id: string }, key?: string | number): void {
		const nextValue = this.prepare?.preparePatch ? this.prepare.preparePatch(value) : value
		this.tx.patch(this.storeName, nextValue, key)
	}

	/**
	 * Queues an operation to remove all records from the object store.
	 */
	clear(): void {
		this.tx.clear(this.storeName)
	}
}
