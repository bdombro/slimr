import type { DbSync } from "./DbSync.js"

/**
 * A typed repository wrapper for a single `DbSync` object store.
 * Provides a localized CRUD interface to minimize boilerplate and
 * enforce consistent data types for a specific table.
 */
export class DbRepository<T> {
	/**
	 * Initializes a new repository tied to a specific object store.
	 *
	 * @param db The centralized `DbSync` instance.
	 * @param storeName The name of the object store this repository will manage.
	 */
	constructor(
		protected db: DbSync,
		public readonly storeName: string,
	) {}

	/**
	 * Retrieves a single record by its primary key.
	 *
	 * @param id The primary key of the record to retrieve.
	 * @returns A promise resolving to the typed record, or `undefined` if not found.
	 */
	async findById(id: string | number): Promise<T | undefined> {
		return this.db.get<T>(this.storeName, id)
	}

	/**
	 * Retrieves all records currently held in the object store.
	 *
	 * @returns A promise resolving to an array of all typed records.
	 */
	async findAll(): Promise<T[]> {
		return this.db.findAll<T>(this.storeName)
	}

	/**
	 * Inserts a new record into the object store.
	 *
	 * @param value The object payload to insert.
	 * @param key An optional explicit primary key.
	 * @returns A promise resolving to the newly inserted record.
	 */
	async add(value: Partial<T>, key?: string | number): Promise<T> {
		return this.db.add<T>(this.storeName, value, key)
	}

	/**
	 * Inserts or updates an existing record in the object store.
	 *
	 * @param value The complete object to upsert.
	 * @param key An optional explicit primary key.
	 * @returns A promise resolving to the upserted record.
	 */
	async put(value: T, key?: string | number): Promise<T> {
		return this.db.put<T>(this.storeName, value, key)
	}

	/**
	 * Removes a record from the object store by its primary key.
	 *
	 * @param key The primary key of the record to delete.
	 * @returns A promise resolving when the deletion is complete.
	 */
	async delete(key: string | number): Promise<void> {
		return this.db.delete(this.storeName, key)
	}

	/**
	 * Partially updates an existing record in the object store.
	 *
	 * @param value The partial object payload.
	 * @param key An optional explicit primary key.
	 * @returns A promise resolving to the final patched record.
	 */
	async patch(value: Partial<T>, key?: string | number): Promise<T> {
		return this.db.patch<T>(this.storeName, value, key)
	}

	/**
	 * Discards all records present in the object store.
	 *
	 * @returns A promise resolving when the store has been completely cleared.
	 */
	async clear(): Promise<void> {
		return this.db.clear(this.storeName)
	}
}
