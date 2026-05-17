import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync } from "./DbSync.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"

/** Creates a clean shared database for each sync test so queue and cursor state never leaks between cases. */
const resetDatabase = async () => {
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase("dbsync")
		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
		request.onblocked = () => resolve()
	})
}

/** Creates a database with the minimum tables needed to exercise sync, auth, and reset behavior. */
const createDb = async () => {
	const db = new DbSync({
		adapter: new RestAdapter({ url: "http://localhost:3000" }),
		version: 1,
		tables: {
			posts: {},
			users: {},
		},
	})
	await db.init()
	return db
}

/** Exercises the sync engine because it is responsible for turning local queue entries into server writes and pulling remote changes back down. */
describe("DbSync sync engine", () => {
	let db: DbSync
	let fetchMock: ReturnType<typeof vi.fn>

	/** Starts each test with a fresh database and a mocked fetch implementation. */
	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)
		db = await createDb()
	})

	/** Cleans up globals and local storage after each case so the suite remains deterministic. */
	afterEach(async () => {
		db.dispose()
		await resetDatabase()
		localStorage.clear()
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	/** Confirms the polling lifecycle starts and stops as expected without calling the network more than once per tick. */
	test("start schedules polling and stop stops it", async () => {
		vi.useFakeTimers()
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
		)

		await db.start()
		expect(db.isStarted).toBe(true)

		await vi.advanceTimersByTimeAsync(db.syncInterval)
		expect(fetchMock).toHaveBeenCalled()

		const callsAfterFirstTick = fetchMock.mock.calls.length
		await db.stop()
		expect(db.isStarted).toBe(false)

		await vi.advanceTimersByTimeAsync(db.syncInterval)
		expect(fetchMock.mock.calls.length).toBe(callsAfterFirstTick)
		vi.useRealTimers()
	})

	/** Confirms syncPull writes remote records locally and advances the cursor. */
	test("pulls remote records into IndexedDB", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					items: [
						{
							id: "remote-1",
							variant: "posts",
							content: JSON.stringify({ content: "from remote", userId: "u1" }),
							updatedAt: "2026-05-17T00:00:00.000Z",
							isDeleted: false,
						},
					],
					hasMore: false,
				}),
				{ status: 200 },
			),
		)

		await db.triggerSync()

		expect(await db.get<any>("posts", "remote-1")).toMatchObject({
			id: "remote-1",
			content: "from remote",
			userId: "u1",
		})
		expect(localStorage.getItem("dbsync-pullSyncedUpTo")).toBe("2026-05-17T00:00:00.000Z")
	})

	/** Confirms syncPush converts dirty records into the backend payload format and clears the dirty queue after a successful push. */
	test("pushes dirty records and clears queues on success", async () => {
		await db.put("posts", { id: "local-1", content: "needs sync", userId: "u1" })
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

		await db.triggerSync()

		expect(fetchMock).toHaveBeenCalledTimes(2)
		const pushCall = fetchMock.mock.calls[1]
		expect(pushCall[0]).toContain("/api/posts/upsert-many")
		const payload = JSON.parse(pushCall[1]?.body as string)
		expect(payload).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "local-1",
					variant: "posts",
					content: JSON.stringify({ id: "local-1", content: "needs sync", userId: "u1" }),
					isDeleted: false,
				}),
				expect.objectContaining({
					id: "version",
					variant: "__dbsync_system",
				}),
			]),
		)
		expect(await db.findAll<any>("dirtyQueue")).toHaveLength(0)
	})

	/** Confirms delete tombstones are preserved for the backend and removed from the local dirty queue. */
	test("pushes deleted records as tombstones", async () => {
		await db.put("posts", { id: "local-2", content: "delete me", userId: "u1" })
		await db.delete("posts", "local-2")
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

		await db.triggerSync()

		const payload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string)
		expect(payload[0]).toMatchObject({
			id: "local-2",
			variant: "posts",
			content: "{}",
			isDeleted: true,
		})
		expect(await db.findAll<any>("deletedQueue")).toHaveLength(0)
	})

	/** Confirms auth checks and login/logout state transitions map to the session endpoints. */
	test("auth lifecycle updates session state", async () => {
		fetchMock
			.mockResolvedValueOnce(new Response("", { status: 200 }))
			.mockResolvedValueOnce(new Response("", { status: 200 }))
			.mockResolvedValueOnce(new Response("", { status: 200 }))

		expect(await db.checkAuth()).toBe(true)
		await db.login("user@example.com", "123456")
		expect(db.isAuth).toBe(true)
		await db.logout()
		expect(db.isAuth).toBe(false)
		expect(fetchMock.mock.calls[1][0]).toContain("/api/session/login")
		expect(fetchMock.mock.calls[2][0]).toContain("/api/session/logout")
	})

	/** Confirms reset clears every store and resets cursor state so the browser starts fresh. */
	test("reset clears local stores and sync cursors", async () => {
		await db.put("posts", { id: "wipe-me", content: "before reset", userId: "u1" })
		localStorage.setItem("dbsync-lastSuccessAt", new Date().toISOString())
		localStorage.setItem("dbsync-pullSyncedUpTo", "2026-05-17T00:00:00.000Z")
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))

		await db.reset()

		expect(await db.findAll("posts")).toEqual([])
		expect(await db.findAll("dirtyQueue")).toEqual([])
		expect(localStorage.getItem("dbsync-lastSuccessAt")).toBeNull()
		expect(localStorage.getItem("dbsync-pullSyncedUpTo")).toBeNull()
	})
})
