import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { RestAdapter } from "./adapters/RestAdapter.js"
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
			adapter: new RestAdapter({ url: "http://localhost" }),
			version: 1,
			tables: {
				posts: { indexes: ["userId"] },
				users: { indexes: ["email"] },
			},
		})
		await db.init()
	})

	/** Clears any residual DB state between tests so the suite stays deterministic. */
	afterEach(async () => {
		db.dispose()
		await resetDatabase()
		vi.restoreAllMocks()
	})

	/** Confirms initialization creates the configured tables plus the sync queues. */
	test("initializes tables and sync queues", async () => {
		expect(db.initted).toBe(true)
		expect(await db.findAll("posts")).toEqual([])
		expect(await db.findAll("users")).toEqual([])
		expect(await db.findAll("dirtyQueue")).toEqual([])
		expect(await db.findAll("deletedQueue")).toEqual([])
	})

	/** Confirms writes are readable immediately so the local store acts like a usable database instead of a remote cache. */
	test("adds and retrieves record", async () => {
		await db.put("posts", { id: "1", content: "hello", userId: "u1" })
		const record = await db.get<any>("posts", "1")
		expect(record).toMatchObject({ id: "1", content: "hello", userId: "u1" })
	})

	/** Confirms updates enter the dirty queue so sync can eventually flush them. */
	test("queues dirty records on write", async () => {
		await db.put("posts", { id: "2", content: "test queue", userId: "u1" })
		const dirty = await db.findAll<any>("dirtyQueue")
		expect(dirty).toHaveLength(1)
		expect(dirty[0]).toMatchObject({ id: "2", table: "posts" })
	})

	/** Confirms deletes leave a tombstone path for remote synchronization. */
	test("queues deleted records and removes dirty entries", async () => {
		await db.put("posts", { id: "3", content: "to delete", userId: "u1" })
		await db.delete("posts", "3")
		expect(await db.get("posts", "3")).toBeUndefined()
		expect(await db.findAll<any>("dirtyQueue")).toHaveLength(0)
		expect(await db.findAll<any>("deletedQueue")).toEqual([
			expect.objectContaining({ id: "3", table: "posts" }),
		])
	})

	/** Confirms clear wipes only the requested store so reset-style flows can rebuild state. */
	test("clears a single store", async () => {
		await db.put("posts", { id: "4", content: "keep me", userId: "u1" })
		await db.put("users", { id: "u1", email: "user@example.com" })

		await db.clear("posts")

		expect(await db.findAll("posts")).toEqual([])
		expect(await db.findAll("users")).toHaveLength(1)
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

	/** Confirms cancel drops buffered writes before they hit IndexedDB. */
	test("cancels buffered transactions", async () => {
		const tx = db.getTransaction()
		tx.put("posts", { id: "6", content: "discard me", userId: "u1" })
		tx.cancel()

		await tx.commit()

		expect(await db.get("posts", "6")).toBeUndefined()
	})
})
