import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { installIndexedDbTestShim } from "../test-support/indexeddb.js"
import { StorageManager } from "./StorageManager.js"

/** Verifies the storage manager's query helpers preserve the expected ordering and selection semantics. */
describe("StorageManager query helpers", () => {
	let storage: StorageManager

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
		storage = new StorageManager(
			{
				adapter: {} as any,
				version: 1,
				tables: { posts: { indexes: ["name", "createdAt"] } },
			} as any,
			{ notifySubscribers: () => undefined } as any,
			() => undefined,
			() => [{ storeName: "posts", indexes: ["name", "createdAt"] }],
		)
		await storage.init()
		await storage.executeTransaction([
			{
				type: "add",
				storeName: "posts",
				value: { id: "1", name: "alpha", score: 1, createdAt: 100 },
			},
			{
				type: "add",
				storeName: "posts",
				value: { id: "2", name: "beta", score: 2, createdAt: 200 },
			},
			{
				type: "add",
				storeName: "posts",
				value: { id: "3", name: "beta", score: 3, createdAt: 300 },
			},
		])
	})

	afterEach(() => {
		storage.dispose()
	})

	test("supports find, getBy, and stream", async () => {
		expect(await storage.find("posts")).toEqual([
			{ id: "1", name: "alpha", score: 1, createdAt: 100 },
			{ id: "2", name: "beta", score: 2, createdAt: 200 },
			{ id: "3", name: "beta", score: 3, createdAt: 300 },
		])
		expect(await storage.find("posts", { index: "name", equals: "beta" })).toEqual([
			{ id: "2", name: "beta", score: 2, createdAt: 200 },
			{ id: "3", name: "beta", score: 3, createdAt: 300 },
		])
		expect(
			await storage.find("posts", { index: "createdAt", lowerBound: 150, upperBound: 250 }),
		).toEqual([{ id: "2", name: "beta", score: 2, createdAt: 200 }])
		expect(await storage.find("posts", { order: "desc", limit: 2 })).toEqual([
			{ id: "3", name: "beta", score: 3, createdAt: 300 },
			{ id: "2", name: "beta", score: 2, createdAt: 200 },
		])
		expect(await storage.getBy("posts", "name", "beta")).toEqual({
			id: "2",
			name: "beta",
			score: 2,
			createdAt: 200,
		})
		const streamResults: any[] = []
		for await (const record of storage.stream("posts", { limit: 1 })) {
			streamResults.push(record)
		}
		expect(streamResults).toEqual([{ id: "1", name: "alpha", score: 1, createdAt: 100 }])
	})

	test("throws when querying an undeclared index", async () => {
		await expect(storage.find("posts", { index: "missing", equals: "beta" })).rejects.toThrow(
			"Index missing is not declared for posts",
		)
	})

	test("creates missing indexes when an existing store is upgraded", async () => {
		storage.dispose()
		await resetDatabase()

		const initialStorage = new StorageManager(
			{
				adapter: {} as any,
				version: 1,
				tables: { posts: { indexes: ["name"] } },
			} as any,
			{ notifySubscribers: () => undefined } as any,
			() => undefined,
			() => [{ storeName: "posts", indexes: ["name"] }],
		)
		await initialStorage.init()
		initialStorage.dispose()

		const upgradedStorage = new StorageManager(
			{
				adapter: {} as any,
				version: 2,
				tables: { posts: { indexes: ["name", "createdAt"] } },
			} as any,
			{ notifySubscribers: () => undefined } as any,
			() => undefined,
			() => [{ storeName: "posts", indexes: ["name", "createdAt"] }],
		)
		await upgradedStorage.init()

		const tx = upgradedStorage.db.transaction("posts", "readonly")
		expect(tx.objectStore("posts").indexNames.contains("createdAt")).toBe(true)
		upgradedStorage.dispose()
	})
})
