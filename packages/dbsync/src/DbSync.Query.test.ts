import { afterEach, beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { DbSync } from "./DbSync.js"
import { DbTable } from "./DbTable.js"
import type { FindOptions, FindQueryResult } from "./internal/queryTypes.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"

describe("DbSync Query Features", () => {
	let db: SearchDatabase

	class SearchDatabase extends DbSync {
		posts = new PostsTable(this)
	}

	type Post = { id: string; title: string; tag: string; extra?: number }

	class PostsTable extends DbTable<Post, Partial<Post>> {
		static tableName = "posts"
		static indexes = ["title", "tag"]
	}

	const resetDatabase = async () => {
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.deleteDatabase("dbsync")
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
			request.onblocked = () => resolve()
		})
	}

	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		db = new SearchDatabase({
			adapter: new LocalAdapter(),
		})
		await db.sync.start()
	})

	afterEach(() => {
		db.dispose()
	})

	test("startsWith: finds records by string prefix (case-sensitive)", async () => {
		await db.posts.add({ id: "1", title: "Apple" })
		await db.posts.add({ id: "2", title: "Apricot" })
		await db.posts.add({ id: "3", title: "Banana" })
		await db.posts.add({ id: "4", title: "apple" })

		const results = await db.posts.find({
			index: "title",
			startsWith: "Ap",
		})

		expect(results.map((r) => r.id).sort()).toEqual(["1", "2"])
	})

	test("equalsAny: finds records matching any of several exact values", async () => {
		await db.posts.add({ id: "1", tag: "red" })
		await db.posts.add({ id: "2", tag: "blue" })
		await db.posts.add({ id: "3", tag: "green" })
		await db.posts.add({ id: "4", tag: "red" })

		const results = await db.posts.find({
			index: "tag",
			equalsAny: ["red", "green"],
		})

		expect(results.map((r) => r.id).sort()).toEqual(["1", "3", "4"])
	})

	test("select and omit infer projected result types", () => {
		expectTypeOf<FindQueryResult<Post, { select: readonly ["id", "title"] }>>().toEqualTypeOf<
			Array<Pick<Post, "id" | "title">>
		>()

		expectTypeOf<FindQueryResult<Post, { omit: readonly ["tag"] }>>().toEqualTypeOf<
			Array<Omit<Post, "tag">>
		>()
	})

	test("select returns partial records from find", async () => {
		await db.posts.add({ id: "1", title: "Apple", tag: "red", extra: 1 })
		await db.posts.add({ id: "2", title: "Banana", tag: "green", extra: 2 })

		const results = await db.posts.find({
			select: ["id", "title"],
		})

		expect(results).toEqual([
			{ id: "1", title: "Apple" },
			{ id: "2", title: "Banana" },
		])
	})

	test("omit returns partial records from find", async () => {
		await db.posts.add({ id: "1", title: "Apple", tag: "red" })

		const results = await db.posts.find({
			omit: ["tag"],
		})

		expect(results).toEqual([{ id: "1", title: "Apple" }])
	})

	test("stream select yields partial records", async () => {
		await db.posts.add({ id: "1", title: "Apple", tag: "red" })
		await db.posts.add({ id: "2", title: "Banana", tag: "green" })

		const results: Array<{ id: string; title: string }> = []
		for await (const record of db.posts.stream({ select: ["id", "title"] })) {
			results.push(record)
		}

		expect(results).toEqual([
			{ id: "1", title: "Apple" },
			{ id: "2", title: "Banana" },
		])
	})

	test("equalsAny with select still returns projected rows", async () => {
		await db.posts.add({ id: "1", tag: "red", title: "A" })
		await db.posts.add({ id: "2", tag: "blue", title: "B" })
		await db.posts.add({ id: "3", tag: "green", title: "C" })

		const results = await db.posts.find({
			index: "tag",
			equalsAny: ["red", "green"],
			select: ["id", "tag"],
		})

		expect(results.map((record) => record.id).sort()).toEqual(["1", "3"])
		expect(results.every((record) => "title" in record === false)).toBe(true)
	})

	test("rejects incompatible query option combinations", async () => {
		await expect(db.posts.find({ startsWith: "Ap" })).rejects.toThrow(
			"startsWith requires an index",
		)
		await expect(
			db.posts.find({
				index: "title",
				startsWith: "Ap",
				equalsAny: ["Apple"],
			}),
		).rejects.toThrow("equalsAny cannot be combined with startsWith")
		await expect(
			db.posts.find({
				index: "title",
				equals: "Apple",
				lowerBound: "A",
			}),
		).rejects.toThrow("equals cannot be combined with range bounds")
		const findRaw: (tableName: string, options?: FindOptions) => Promise<unknown> = db.find.bind(db)
		await expect(
			findRaw("posts", {
				select: ["id"],
				omit: ["title"],
			}),
		).rejects.toThrow("select cannot be combined with omit")
	})
})
