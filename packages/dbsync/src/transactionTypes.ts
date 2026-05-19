import type { DbRepository } from "./DbRepository.js"
import type { DbTable } from "./DbTable.js"
import type { DbTxRepository } from "./DbTxRepository.js"
import type { DbTransaction } from "./internal/DbTransaction.js"

/** Keys on a DbSync subclass that hold table repositories. */
export type TablePropertyKeys<TDb> = {
	[K in keyof TDb]: TDb[K] extends DbTable<any, any> | DbRepository<any> ? K : never
}[keyof TDb]

/** Maps a table repository property to its transaction-scoped write facade. */
export type TransactionTableRepo<TValue> =
	TValue extends DbTable<infer Row, infer CreateInput>
		? DbTxRepository<Row, CreateInput>
		: TValue extends DbRepository<infer Row>
			? DbTxRepository<Row, Partial<Row>>
			: never

/**
 * Transaction return type for a DbSync instance, including typed `db.posts`-style
 * repositories for each table property on the database class.
 */
export type TransactionOf<TDb> = DbTransaction & {
	[K in TablePropertyKeys<TDb>]: TransactionTableRepo<TDb[K]>
}
