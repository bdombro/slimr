import { DbRepository } from "./DbRepository.js"
import type { DbSync } from "./DbSync.js"

type DbTableConstructor<Row extends { id: string }, CreateInput extends object> = {
	new (db: DbSync): DbTable<Row, CreateInput>
	tableName: string
	indexes?: string[]
	migrations?: unknown[]
}

/**
 * Base class for table-specific repositories.
 *
 * Table subclasses define the stored row shape with class fields and carry
 * static metadata used by DbSync to build schema and transaction facades.
 */
export class DbTable<
	Row extends { id: string },
	CreateInput extends object = Row,
> extends DbRepository<Row> {
	constructor(db: DbSync) {
		const ctor = new.target as DbTableConstructor<Row, CreateInput>
		if (!ctor.tableName) {
			throw new Error("DbTable subclasses must define static tableName")
		}
		super(db, ctor.tableName)
		;(db as any).registerTable?.(this)
	}

	/** Default create-preparation injects an id when one is not provided. */
	prepareCreate(input: CreateInput): Row {
		const nextValue = { ...(input as Record<string, any>) }
		if (nextValue.id === undefined || nextValue.id === null) {
			nextValue.id = this.db.genUuid()
		}
		return nextValue as Row
	}

	/** Default put-preparation is a pass-through; subclasses can validate/normalize. */
	preparePut(input: Row): Row {
		return input
	}

	/** Default patch-preparation is a pass-through; subclasses can validate/normalize. */
	preparePatch(input: Partial<Row> & { id: string }): Partial<Row> & { id: string } {
		return input
	}

	/** Adds a row after normalizing create input through prepareCreate(). */
	override async add(value: CreateInput, key?: string): Promise<Row> {
		const nextValue = this.prepareCreate(value)
		const [executedWrite] = await this.db.storage.executeTransaction([
			{ type: "add", storeName: this.tableName, value: nextValue, key },
		])
		return executedWrite?.value as Row
	}

	/** Upserts a row after normalizing it through preparePut(). */
	override async put(value: Row, key?: string): Promise<Row> {
		const nextValue = this.preparePut(value)
		const [executedWrite] = await this.db.storage.executeTransaction([
			{ type: "put", storeName: this.tableName, value: nextValue, key },
		])
		return executedWrite?.value as Row
	}

	/** Applies partial updates after normalizing them through preparePatch(). */
	override async patch(value: Partial<Row> & { id: string }, key?: string): Promise<Row> {
		const nextValue = this.preparePatch(value)
		await this.db.storage.executeTransaction([
			{ type: "patch", storeName: this.tableName, value: nextValue, key },
		])
		return nextValue as Row
	}
}
