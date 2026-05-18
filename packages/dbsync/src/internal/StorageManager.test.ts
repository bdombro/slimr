import { describe, expect, test, vi } from "vitest"
import { StorageManager } from "./StorageManager.js"

/** Verifies the storage manager's query helpers preserve the expected ordering and selection semantics. */
describe("StorageManager query helpers", () => {
	test("supports getAll, find, getBy, stream, and streamAll", async () => {
		const records = [
			{ id: "1", name: "alpha", score: 1, createdAt: 100 },
			{ id: "2", name: "beta", score: 2, createdAt: 200 },
			{ id: "3", name: "beta", score: 3, createdAt: 300 },
		]

		const storage = new StorageManager(
			{
				adapter: {} as any,
				tables: { posts: { indexes: ["name", "createdAt"] } },
			} as any,
			{ notifySubscribers: vi.fn() } as any,
			vi.fn(),
			() => [{ storeName: "posts", indexes: ["name", "createdAt"] }],
		)

		vi.spyOn(storage, "getAll").mockResolvedValue(records as any)

		expect(await storage.getAll("posts")).toEqual(records)
		expect(await storage.find("posts", { index: "name", equals: "beta" })).toEqual([
			{ id: "2", name: "beta", score: 2, createdAt: 200 },
			{ id: "3", name: "beta", score: 3, createdAt: 300 },
		])
		expect(await storage.find("posts", { index: "createdAt", lowerBound: 150, upperBound: 250 })).toEqual([
			{ id: "2", name: "beta", score: 2, createdAt: 200 },
		])
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
		expect(await Array.fromAsync(storage.stream("posts", { limit: 1 }))).toEqual([
			{ id: "1", name: "alpha", score: 1, createdAt: 100 },
		])
		expect(await Array.fromAsync(storage.streamAll("posts"))).toEqual(records)
	})
})
