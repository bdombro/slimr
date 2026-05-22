import { describe, expectTypeOf, test } from "vitest"
import type { DbAuthPhase } from "./authTypes.js"
import { DbTable } from "./DbTable.js"
import type { SyncState } from "./internal/EventBus.js"
import { type DbSyncAuthR, DbSyncR, type DbSyncSyncR } from "./react/DbSyncReact.js"
import type { ObservableReact } from "./react/ObservableReact.js"
import { useDbQuery } from "./react/useDbQuery.js"
import { wireAuth } from "./test-support/wireAuth.js"
import type { TransactionOf } from "./transactionTypes.js"

type Post = { id: string; title: string }

class PostsTable extends DbTable<Post, { title: string }> {
	static tableName = "posts"
}

class AppDb extends DbSyncR {
	posts = new PostsTable(this)
}

type App = InstanceType<typeof AppDb>

/** Compile-time contract for `class AppDb extends DbSyncR` with `DbTable` fields. */
describe("DbSyncR types", () => {
	test("DbTable constructor accepts AppDb", () => {
		expectTypeOf(PostsTable).toBeConstructibleWith({} as App)
	})

	test("TransactionOf includes DbTable repos", () => {
		type Tx = TransactionOf<App>
		type PostsTx = Tx["posts"]

		expectTypeOf<PostsTx>().toHaveProperty("add")
		expectTypeOf<PostsTx>().toHaveProperty("patch")
		expectTypeOf<Tx>().toHaveProperty("commit")
		expectTypeOf<Tx>().toHaveProperty("cancel")
	})

	test("getTransaction return type matches TransactionOf", () => {
		type Tx = ReturnType<App["getTransaction"]>
		expectTypeOf<Tx>().toExtend<TransactionOf<App>>()
		expectTypeOf<Tx["posts"]>().toHaveProperty("add")
	})

	test("useDbQuery accepts AppDb", () => {
		const db = {} as App
		expectTypeOf(useDbQuery).toBeCallableWith(db, "posts", () => db.posts.find())
		expectTypeOf(useDbQuery<Post[]>).returns.toEqualTypeOf<{
			value: Post[] | null
			loading: boolean
		}>()
	})

	test("wireAuth accepts AppDb", () => {
		const db = {} as App
		expectTypeOf(wireAuth).toBeCallableWith(db)
		expectTypeOf(wireAuth).toBeCallableWith(db, { onLogout: () => {} })
	})

	test("table repo methods stay typed", () => {
		expectTypeOf<App["posts"]>().toEqualTypeOf<PostsTable>()
		expectTypeOf<App["posts"]["subscribe"]>().toBeCallableWith((_changes) => {})
	})

	test("wrapped observables are ObservableReact with typed values", () => {
		expectTypeOf<App["auth"]>().toExtend<DbSyncAuthR>()
		expectTypeOf<App["sync"]>().toExtend<DbSyncSyncR>()

		expectTypeOf<App["auth"]["phase$"]>().toExtend<ObservableReact<DbAuthPhase>>()
		expectTypeOf<App["auth"]["phase$"]["val"]>().toEqualTypeOf<DbAuthPhase>()
		expectTypeOf<App["auth"]["phase$"]["use"]>().toBeFunction()

		expectTypeOf<App["auth"]["canQuery$"]>().toExtend<ObservableReact<boolean>>()
		expectTypeOf<App["sync"]["state$"]>().toExtend<ObservableReact<SyncState>>()
	})
})
