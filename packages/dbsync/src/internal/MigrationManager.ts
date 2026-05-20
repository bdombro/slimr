/**
 * Defines a single, sequential schema evolution step for a document structure.
 * Migrations allow existing offline data to be selectively upgraded rather than wiped
 * when backend domain modeling changes.
 */
export interface Migration<T = any> {
	/**
	 * An ascending integer determining execution order. A record currently at `storeVersion: 1`
	 * will only trigger migrations where `version >= 2`.
	 */
	version: number

	/**
	 * A human-readable note summarizing the structural change.
	 */
	note: string

	/**
	 * Mutates the provided record in-place to comply with the new schema structure.
	 *
	 * @param record The raw record needing an upgrade.
	 * @returns A promise that resolves when the record has been fully transformed.
	 */
	upgrade(record: T): Promise<void>
}

/**
 * An engine for applying a suite of `IMigration` objects to all records
 * across targeted `DbSync` object stores.
 */
export class MigrationManager {
	/**
	 * Initializes the MigrationManager for a specific database instance.
	 *
	 * @internal
	 * @param db The `DbSync` instance used to traverse object stores and apply rewrites.
	 */
	constructor(private db: any) {} // db is DbSync instance

	/**
	 * Iterates through a map of object stores and systematically applies their respective migrations.
	 *
	 * @param schemaMigrations A dictionary mapping store names to arrays of `IMigration` steps.
	 */
	async runAll(schemaMigrations: Record<string, Migration[]>) {
		for (const [storeName, migrations] of Object.entries(schemaMigrations)) {
			await this.upgradeStore(storeName, migrations)
		}
	}

	/**
	 * Sorts and attempts to apply a sequence of migrations to a single record in memory.
	 * Evaluates `storeVersion` to ensure migrations are only executed sequentially and exactly once.
	 *
	 * @param record The plain object to be upgraded.
	 * @param migrations The full list of potential migrations for the record's domain type.
	 * @returns The functionally upgraded record with an updated `storeVersion`.
	 */
	public static async upgradeRecord<T>(record: any, migrations: Migration<T>[]) {
		const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version)
		for (const migration of sortedMigrations) {
			const currentVersion = record.storeVersion || 0
			if (currentVersion < migration.version) {
				await migration.upgrade(record)
				record.storeVersion = migration.version
			}
		}
		return record
	}

	/**
	 * Reads all records from a specific store, upgrades out-of-date entries,
	 * and atomically flushes the changed entries back within a single database transaction.
	 *
	 * @param storeName The name of the target object store.
	 * @param migrations The ordered array of migrations applicable to the store.
	 */
	private async upgradeStore(storeName: string, migrations: Migration[]) {
		const allRecords = await this.db.find(storeName)
		const tx = this.db.getTransaction()

		for (const recordCurrent of allRecords) {
			const recordNext = { ...recordCurrent }
			await MigrationManager.upgradeRecord(recordNext, migrations)

			if (recordNext.storeVersion !== recordCurrent.storeVersion) {
				tx.put(storeName, recordNext)
			}
		}

		await tx.commit()
	}
}
