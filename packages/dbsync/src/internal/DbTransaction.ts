// DbTransaction does not depend on DbSync now

/**
 * Represents an atomic sequence of write operations.
 * Operations are queued in memory and only executed against the target
 * database when `commit()` is called.
 */
export class DbTransaction {
	/**
	 * Stores the pending CRUD operations.
	 * @internal Evaluated and executed by the executor function upon `commit()`.
	 */
	private operations: {
		type: "put" | "add" | "delete" | "clear"
		storeName: string
		value?: any
		key?: string | number
	}[] = []

	/**
	 * Initializes the transaction with an execution engine.
	 * Should be instantiated via `DbSync.getTransaction()` rather than directly.
	 *
	 * @internal
	 * @param executor Provides the context needed to process the queued operations.
	 */
	constructor(private executor: (ops: any[]) => Promise<void>) {}

	/**
	 * Queues an insertion operation.
	 *
	 * @param storeName The name of the target object store.
	 * @param value The object payload to insert.
	 * @param key An optional explicit primary key.
	 */
	add(storeName: string, value: any, key?: string | number) {
		this.operations.push({ type: "add", storeName, value, key })
	}

	/**
	 * Queues an upsert (insert or update) operation.
	 *
	 * @param storeName The name of the target object store.
	 * @param value The object payload to write.
	 * @param key An optional explicit primary key.
	 */
	put(storeName: string, value: any, key?: string | number) {
		this.operations.push({ type: "put", storeName, value, key })
	}

	/**
	 * Queues a deletion operation.
	 *
	 * @param storeName The name of the target object store.
	 * @param key The primary key of the record to remove.
	 */
	delete(storeName: string, key: string | number) {
		this.operations.push({ type: "delete", storeName, key })
	}

	/**
	 * Queues an operation to remove all records from an object store.
	 *
	 * @param storeName The name of the object store to clear.
	 */
	clear(storeName: string) {
		this.operations.push({ type: "clear", storeName })
	}

	/**
	 * Executes all queued operations atomically within a single database transaction.
	 *
	 * @returns A promise that resolves when the transaction successfully completes.
	 */
	async commit(): Promise<void> {
		if (this.operations.length === 0) return
		return this.executor(this.operations)
	}

	/**
	 * Discards all pending operations without modifying the database.
	 */
	cancel() {
		this.operations = []
	}
}
