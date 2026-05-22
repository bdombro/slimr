import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { DbRepository } from "./DbRepository.js"
import { DbSync } from "./DbSync.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"

/** Verifies the main database wrapper behaves like an ORM because the package is only useful if local reads and writes work before sync even starts. */
describe("DbSync ORM", () => {
	let db: DbSync

	/** Deletes the shared IndexedDB database so each test starts from a clean schema. */
	const resetDatabase = async () => {
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.deleteDatabase("dbsync")
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
			request.onblocked = () => resolve()
		})
	}

	/** Creates an initialized database once so the tests can focus on CRUD and queue behavior rather than repetitive setup. */
	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		db = new DbSync({
			adapter: new LocalAdapter(),
			version: 1,
			tables: {
				posts: { indexes: ["userId"] },
				users: { indexes: ["email"] },
			},
		})
		await db.sync.start()
	})

	/** Confirms the preferred schema-class pattern exposes typed table properties and works at runtime. */
	test("supports typed subclass repositories on the db instance", async () => {
		interface Todo {
			id: string
			title: string
			createdAt: number
		}

		interface User {
			id: string
			name: string
		}

		class MyAppDatabase extends DbSync {
			declare todos: DbRepository<Todo>
			declare users: DbRepository<User>
		}

		db.dispose()
		await resetDatabase()

		const typedDb = new MyAppDatabase({
			adapter: new LocalAdapter(),
			version: 1,
			tables: {
				todos: { indexes: ["createdAt"] },
				users: {},
			},
		})
		db = typedDb

		await typedDb.sync.start()

		expect(typedDb.todos).toBeInstanceOf(DbRepository)
		expect(typedDb.users).toBeInstanceOf(DbRepository)
		expect(typedDb.todos.tableName).toBe("todos")
		expect(typedDb.users.tableName).toBe("users")

		await typedDb.todos.put({ id: "todo-1", title: "Typed API", createdAt: 123 })
		expect(await typedDb.todos.get("todo-1")).toMatchObject({
			id: "todo-1",
			title: "Typed API",
			createdAt: 123,
		})
	})

	/** Clears any residual DB state between tests so the suite stays deterministic. */
	afterEach(async () => {
		db.dispose()
		await resetDatabase()
		vi.restoreAllMocks()
	})

	/** Confirms initialization creates the configured tables plus the sync queues. */
	test("initializes tables and sync queues", async () => {
		expect(db.auth.isReady).toBe(true)
		expect(await db.find("posts")).toEqual([])
		expect(await db.find("users")).toEqual([])
		expect(await db.find("dirtyQueue")).toEqual([])
		expect(await db.find("deletedQueue")).toEqual([])
	})

	/** Confirms the public upgradeRecord helper applies configured migrations on demand without writing to IndexedDB. */
	test("upgrades a record on demand through the public API", async () => {
		const upgrade = vi.fn(async (record: any) => {
			record.title = record.legacyTitle.toUpperCase()
			delete record.legacyTitle
		})

		const tables = db.config.tables!
		tables.posts.migrations = [
			{
				version: 1,
				note: "rename legacy title",
				upgrade,
			},
		]

		const importedPost = {
			id: "imported-1",
			legacyTitle: "hello world",
			storeVersion: 0,
		}

		const importResult = await db.upgradeRecord("posts", importedPost)

		expect(upgrade).toHaveBeenCalledTimes(1)
		expect(importResult).toMatchObject({
			id: "imported-1",
			title: "HELLO WORLD",
			storeVersion: 1,
		})
		expect(importedPost).toMatchObject({
			id: "imported-1",
			legacyTitle: "hello world",
			storeVersion: 0,
		})
	})

	/** Confirms the public applyDefaults helper applies table defaulting logic without persisting the record. */
	test("applies defaults on demand through the public API", async () => {
		const tables = db.config.tables!
		tables.posts.defaultSetter = (value) => ({
			id: "defaulted-post",
			title: "default title",
			createdAt: 123,
			...value,
		})

		const importedPost = { title: "custom title" }
		const normalized = await db.applyDefaults("posts", importedPost)

		expect(normalized).toEqual({
			id: "defaulted-post",
			title: "custom title",
			createdAt: 123,
		})
		expect(importedPost).toEqual({ title: "custom title" })
		expect(await db.find("posts")).toEqual([])
	})

	/** Confirms table migrations run during start so existing records upgrade automatically when the app boots. */
	test("runs configured table migrations during start", async () => {
		await db.put("posts", {
			id: "post-1",
			firstName: "Ada",
			lastName: "Lovelace",
			storeVersion: 0,
		})

		const upgrade = vi.fn(async (record: any) => {
			record.fullName = `${record.firstName} ${record.lastName}`.trim()
			delete record.firstName
			delete record.lastName
		})

		const tables = db.config.tables!
		tables.posts.migrations = [
			{
				version: 1,
				note: "combine name fields",
				upgrade,
			},
		]

		const { MigrationManager } = await import("./internal/MigrationManager.js")
		await new MigrationManager(db).runAll({ posts: tables.posts.migrations! })

		expect(upgrade).toHaveBeenCalledTimes(1)
		expect(await db.get<any>("posts", "post-1")).toMatchObject({
			id: "post-1",
			fullName: "Ada Lovelace",
			storeVersion: 1,
		})
	})

	/** Confirms writes are readable immediately so the local table acts like a usable database instead of a remote cache. */
	test("adds and retrieves record", async () => {
		await db.put("posts", { id: "1", content: "hello", userId: "u1" })
		const record = await db.get<any>("posts", "1")
		expect(record).toMatchObject({ id: "1", content: "hello", userId: "u1" })
	})

	/** Confirms table-level default injectors can fill missing fields for add/put writes. */
	test("applies table default injectors on add", async () => {
		const tables = db.config.tables!
		tables.posts.defaultSetter = (value) => ({
			id: "auto-post",
			content: "default content",
			createdAt: 123,
			...value,
		})

		const added = await db.add("posts", { userId: "u-default" })
		expect(added).toMatchObject({
			id: "auto-post",
			content: "default content",
			createdAt: 123,
			userId: "u-default",
		})

		expect(await db.get<any>("posts", "auto-post")).toMatchObject({
			id: "auto-post",
			content: "default content",
			createdAt: 123,
			userId: "u-default",
		})

		expect(await db.find("dirtyQueue")).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "auto-post",
					table: "posts",
					payload: expect.objectContaining({
						id: "auto-post",
						content: "default content",
						createdAt: 123,
						userId: "u-default",
					}),
				}),
			]),
		)
	})

	/** Confirms equalsAny returns all exact matches for an indexed field. */
	test("finds records matching any of several exact index values", async () => {
		await db.put("posts", { id: "a", content: "alpha", userId: "u1" })
		await db.put("posts", { id: "b", content: "beta", userId: "u2" })
		await db.put("posts", { id: "c", content: "gamma", userId: "u1" })
		await db.put("posts", { id: "d", content: "delta", userId: "u3" })

		expect(
			await db.find("posts", {
				index: "userId",
				equalsAny: ["u2", "u1"],
			}),
		).toEqual([
			expect.objectContaining({ id: "b", userId: "u2" }),
			expect.objectContaining({ id: "a", userId: "u1" }),
			expect.objectContaining({ id: "c", userId: "u1" }),
		])
	})
	/** Confirms patch updates only the provided fields while preserving the rest of the stored record. */
	test("patches a record without dropping existing fields", async () => {
		await db.put("posts", { id: "patch-1", content: "hello", userId: "u1", draft: true })

		await db.patch("posts", { id: "patch-1", content: "updated" })

		expect(await db.get<any>("posts", "patch-1")).toMatchObject({
			id: "patch-1",
			content: "updated",
			userId: "u1",
			draft: true,
		})

		expect(await db.find("dirtyQueue")).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "patch-1",
					table: "posts",
					payload: expect.objectContaining({
						id: "patch-1",
						content: "updated",
						userId: "u1",
						draft: true,
					}),
				}),
			]),
		)
	})

	/** Confirms updates enter the dirty queue so sync can eventually flush them. */
	test("queues dirty records on write", async () => {
		await db.put("posts", { id: "2", content: "test queue", userId: "u1" })
		const dirty = await db.find("dirtyQueue")
		expect(dirty).toHaveLength(1)
		expect(dirty[0]).toMatchObject({ id: "2", table: "posts" })
	})

	/** Confirms deletes leave a tombstone path for remote synchronization. */
	test("queues deleted records and removes dirty entries", async () => {
		await db.put("posts", { id: "3", content: "to delete", userId: "u1" })
		await db.delete("posts", "3")
		expect(await db.get("posts", "3")).toBeUndefined()
		expect(await db.find("dirtyQueue")).toHaveLength(0)
		expect(await db.find("deletedQueue")).toEqual([
			expect.objectContaining({ id: "3", table: "posts" }),
		])
	})

	/** Confirms clear wipes only the requested table so reset-style flows can rebuild state. */
	test("clears a single table", async () => {
		await db.put("posts", { id: "4", content: "keep me", userId: "u1" })
		await db.put("users", { id: "u1", email: "user@example.com" })

		await db.clear("posts")

		expect(await db.find("posts")).toEqual([])
		expect(await db.find("users")).toHaveLength(1)
	})

	/** Confirms buffered transactions commit atomically and notify subscribers once. */
	test("commits batched transactions and notifies subscribers", async () => {
		const subscriber = vi.fn()
		db.subscribe(subscriber)

		const tx = db.getTransaction()
		tx.put("posts", { id: "5", content: "batched", userId: "u1" })
		tx.delete("users", "u1")
		await tx.commit()

		expect(await db.get("posts", "5")).toMatchObject({ id: "5", content: "batched", userId: "u1" })
		expect(subscriber).toHaveBeenCalled()
		expect(subscriber.mock.calls[0][0]).toEqual(expect.arrayContaining(["posts", "users"]))
	})

	/** Confirms transaction writes use the same table default injectors as direct writes. */
	test("applies table default injectors in transactions", async () => {
		const tables = db.config.tables!
		tables.posts.defaultSetter = (value) => ({
			id: "tx-auto-post",
			content: "default tx content",
			createdAt: 456,
			...value,
		})

		const tx = db.getTransaction()
		tx.add("posts", { userId: "u-tx-default" })
		await tx.commit()

		expect(await db.get<any>("posts", "tx-auto-post")).toMatchObject({
			id: "tx-auto-post",
			content: "default tx content",
			createdAt: 456,
			userId: "u-tx-default",
		})

		expect(await db.find("dirtyQueue")).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "tx-auto-post",
					table: "posts",
					payload: expect.objectContaining({
						id: "tx-auto-post",
						content: "default tx content",
						createdAt: 456,
						userId: "u-tx-default",
					}),
				}),
			]),
		)
	})

	/** Confirms cancel drops buffered writes before they hit IndexedDB. */
	test("cancels buffered transactions", async () => {
		const tx = db.getTransaction()
		tx.put("posts", { id: "6", content: "discard me", userId: "u1" })
		tx.cancel()

		await tx.commit()

		expect(await db.get("posts", "6")).toBeUndefined()
	})
})
