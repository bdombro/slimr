import { describe, expectTypeOf, test } from "vitest"
import type { DbRepository } from "./DbRepository.js"
import { DbSync } from "./DbSync.js"
import { DbTable } from "./DbTable.js"
import type { TransactionOf } from "./transactionTypes.js"

class PostsTable extends DbTable<{ id: string; title: string }, { title: string }> {
	static tableName = "posts"
}

class TypedAppDb extends DbSync {
	posts = new PostsTable(this)
}

class ConfigOnlyDb extends DbSync {}

/** Verifies transaction types expose table repositories matching the database class. */
describe("TransactionOf", () => {
	test("includes DbTable properties on the transaction type", () => {
		type PostsTxRepo = TransactionOf<TypedAppDb>["posts"]

		expectTypeOf<PostsTxRepo>().toHaveProperty("add")
		expectTypeOf<PostsTxRepo>().toHaveProperty("patch")
		expectTypeOf<TransactionOf<TypedAppDb>>().toHaveProperty("commit")
	})

	test("includes config-backed DbRepository properties on the transaction type", () => {
		type ConfigDb = ConfigOnlyDb & { posts: DbRepository<{ id: string; title: string }> }
		type PostsTxRepo = TransactionOf<ConfigDb>["posts"]

		expectTypeOf<PostsTxRepo>().toHaveProperty("patch")
	})
})
