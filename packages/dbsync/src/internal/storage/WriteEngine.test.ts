import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { installIndexedDbTestShim } from "../../test-support/indexeddb.js"
import { StorageManager } from "./StorageManager.js"
import { applyDefaults, WriteEngine } from "./WriteEngine.js"

/** Verifies the extracted write engine still applies defaults, merges patches, and updates the sync queues. */
const postsTableConfig = {
	indexes: ["name"],
	defaultSetter: (value: Record<string, unknown>) => ({
		createdAt: 123,
		...value,
	}),
}

const testDbConfig = {
	adapter: {} as any,
	version: 1,
	tables: {
		posts: postsTableConfig,
	},
}

describe("WriteEngine", () => {
	let storage: StorageManager
	let events: { notifySubscribers: ReturnType<typeof vi.fn> }
	let engine: WriteEngine

	/** Deletes the shared IndexedDB database so each test starts from a clean schema. */
	const resetDatabase = async () => {
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.deleteDatabase("dbsync")
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
			request.onblocked = () => resolve()
		})
	}

	/** Creates a real database instance so the write engine can exercise IndexedDB transactions directly. */
	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		events = { notifySubscribers: vi.fn() }
		storage = new StorageManager(
			testDbConfig as any,
			events as any,
			() => undefined,
			() => [{ storeName: "posts", indexes: ["name"] }],
		)
		await storage.init()
		engine = new WriteEngine(testDbConfig as any, events as any, () => storage.db)
	})

	/** Cleans up the IndexedDB connection after each case. */ afterEach(() => {
		storage.dispose()
	})

	test("applies defaults without mutating the input object", () => {
		const input = { title: "hello" }
		const normalized = applyDefaults(
			{
				defaultSetter: (value) => ({
					createdAt: 123,
					...value,
				}),
			},
			input,
		)

		expect(normalized).toEqual({ title: "hello", createdAt: 123 })
		expect(input).toEqual({ title: "hello" })
	})

	test("patches existing records and keeps the dirty queue in sync", async () => {
		await engine.executeTransaction([
			{
				type: "add",
				storeName: "posts",
				value: { id: "post-1", name: "alpha", score: 1 },
			},
		])
		events.notifySubscribers.mockClear()

		const [executedWrite] = await engine.executeTransaction([
			{
				type: "patch",
				storeName: "posts",
				value: { id: "post-1", score: 2 },
			},
		])

		expect(executedWrite).toMatchObject({
			type: "patch",
			storeName: "posts",
			key: "post-1",
			value: {
				id: "post-1",
				name: "alpha",
				score: 2,
				createdAt: 123,
			},
		})
		expect(await storage.get("posts", "post-1")).toEqual({
			id: "post-1",
			name: "alpha",
			score: 2,
			createdAt: 123,
		})
		expect(await storage.find("dirtyQueue")).toEqual([
			expect.objectContaining({
				id: "post-1",
				table: "posts",
				payload: {
					id: "post-1",
					name: "alpha",
					score: 2,
					createdAt: 123,
				},
			}),
		])
		expect(events.notifySubscribers).toHaveBeenCalledWith(
			["posts", "dirtyQueue", "deletedQueue"],
			[{ table: "posts", change: "update", id: "post-1" }],
		)
	})

	test("notifies insert changes for add operations", async () => {
		events.notifySubscribers.mockClear()
		await engine.executeTransaction([
			{
				type: "add",
				storeName: "posts",
				value: { id: "post-1", name: "alpha" },
			},
		])
		expect(events.notifySubscribers).toHaveBeenCalledWith(
			["posts", "dirtyQueue", "deletedQueue"],
			[{ table: "posts", change: "insert", id: "post-1" }],
		)
	})

	test("notifies delete changes for delete operations", async () => {
		await engine.executeTransaction([
			{
				type: "add",
				storeName: "posts",
				value: { id: "post-1", name: "alpha" },
			},
		])
		events.notifySubscribers.mockClear()
		await engine.executeTransaction([{ type: "delete", storeName: "posts", key: "post-1" }])
		expect(events.notifySubscribers).toHaveBeenCalledWith(
			["posts", "dirtyQueue", "deletedQueue"],
			[{ table: "posts", change: "delete", id: "post-1" }],
		)
	})

	test("skipQueue writes do not enqueue dirty or deleted queues", async () => {
		await engine.executeTransaction([
			{
				type: "put",
				storeName: "posts",
				value: { id: "remote-1", name: "from server" },
				skipQueue: true,
			},
		])

		expect(await storage.get("posts", "remote-1")).toEqual({
			id: "remote-1",
			name: "from server",
		})
		expect(await storage.find("dirtyQueue")).toEqual([])
		expect(await storage.find("deletedQueue")).toEqual([])
	})

	test("notifies clear changes and drops prior row ops in the same batch", async () => {
		events.notifySubscribers.mockClear()
		await engine.executeTransaction([
			{
				type: "add",
				storeName: "posts",
				value: { id: "post-1", name: "alpha" },
			},
			{ type: "clear", storeName: "posts" },
		])
		expect(events.notifySubscribers).toHaveBeenCalledWith(
			["posts", "dirtyQueue", "deletedQueue"],
			[{ table: "posts", change: "clear" }],
		)
	})
})
