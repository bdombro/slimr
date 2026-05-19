import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync } from "./DbSync.js"
import { DbTable } from "./DbTable.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"

describe("DbSync Query Features", () => {
	let db: SearchDatabase

	class SearchDatabase extends DbSync {
		posts = new PostsTable(this)
	}

	class PostsTable extends DbTable<any, any> {
		static tableName = "posts"
		static indexes = ["title", "tag"]
	}

	const resetDatabase = async () => {
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.deleteDatabase("dbsync-search")
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
			request.onblocked = () => resolve()
		})
	}

	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		db = new SearchDatabase({
			adapter: new RestAdapter({ url: "http://localhost" }),
		})
		await db.init()
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
	})
})
