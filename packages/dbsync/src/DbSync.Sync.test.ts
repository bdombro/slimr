import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync } from "./DbSync.js"
import { writeIsLoggedIn } from "./internal/authStorage.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"
import { wireAuth } from "./test-support/wireAuth.js"

/** Creates a clean shared database for each sync test so queue and cursor state never leaks between cases. */
const resetDatabase = async () => {
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase("dbsync")
		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
		request.onblocked = () => resolve()
	})
}

/** Creates a database with the minimum tables needed to exercise sync, auth, and logout behavior. */
const createDb = async (fetchMock: ReturnType<typeof vi.fn>) => {
	writeIsLoggedIn(true)
	const db = new DbSync({
		adapter: new RestAdapter({ url: "http://localhost:3000" }),
		version: 1,
		tables: {
			posts: {},
			users: {},
		},
		lifecycle: { manual: true },
	})
	wireAuth(db)
	fetchMock.mockResolvedValue(
		new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
	)
	await db.boot()
	await db.sync.start()
	await db.sync.trigger()
	await db.sync.stop()
	fetchMock.mockReset()
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
		vi.stubGlobal("navigator", {
			...navigator,
			onLine: true,
			locks: {
				request: async (_name: string, fn: () => Promise<void>) => {
					await fn()
				},
			},
		})
		db = await createDb(fetchMock)
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
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
		)
		db.syncInterval = 25

		await db.sync.start()
		expect(db.sync.isStarted).toBe(true)

		await db.sync.trigger()
		expect(fetchMock).toHaveBeenCalled()

		fetchMock.mockClear()
		await new Promise<void>((resolve) => setTimeout(resolve, 30))
		expect(fetchMock).toHaveBeenCalled()

		await db.sync.stop()
		expect(db.sync.isStarted).toBe(false)

		fetchMock.mockClear()
		await new Promise<void>((resolve) => setTimeout(resolve, 30))
		expect(fetchMock).not.toHaveBeenCalled()
	})

	test("isInitialSyncPending until first successful sync then clears on logout", async () => {
		expect(db.auth.isBooted).toBe(true)
		expect(db.auth.isInitialSyncPending).toBe(true)
		expect(db.auth.isInitialSyncPending$.val).toBe(true)
		expect(db.auth.phase).toBe("initial-sync")
		fetchMock.mockReset()
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
		await db.sync.trigger()
		expect(db.auth.isInitialSyncPending).toBe(false)
		expect(db.auth.phase).toBe("ready")
		await db.auth.logout()
		expect(db.auth.isInitialSyncPending).toBe(false)
		expect(db.auth.phase).toBe("logged-out")
		writeIsLoggedIn(true)
		const relogged = await createDb(fetchMock)
		expect(relogged.auth.isInitialSyncPending).toBe(true)
		relogged.dispose()
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
							updatedAt: Date.parse("2026-05-17T00:00:00.000Z"),
							isDeleted: false,
						},
					],
					hasMore: false,
				}),
				{ status: 200 },
			),
		)

		await db.sync.trigger()

		expect(await db.get<any>("posts", "remote-1")).toMatchObject({
			id: "remote-1",
			content: "from remote",
			userId: "u1",
		})
		expect(await db.find("dirtyQueue")).toEqual([])
		expect(await db.find("deletedQueue")).toEqual([])
		expect(localStorage.getItem("dbsync-pullSyncedUpTo")).toBe(
			String(Date.parse("2026-05-17T00:00:00.000Z")),
		)
	})

	/** Confirms pull does not overwrite a row that still has a pending local mutation. */
	test("pull skips rows in dirtyQueue", async () => {
		await db.put("posts", { id: "local-3", content: "still editing", userId: "u1" })
		fetchMock.mockReset()
		fetchMock
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						items: [
							{
								id: "local-3",
								variant: "posts",
								content: JSON.stringify({ content: "from server echo", userId: "u1" }),
								updatedAt: 1_715_769_600_000,
								isDeleted: false,
							},
						],
						hasMore: false,
					}),
					{ status: 200 },
				),
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

		await db.sync.trigger()

		expect(await db.get<any>("posts", "local-3")).toMatchObject({
			id: "local-3",
			content: "still editing",
		})
	})

	/** Confirms pulled rows are not pushed back in the same sync cycle. */
	test("pull does not enqueue pulled rows for push", async () => {
		fetchMock.mockReset()
		fetchMock
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						items: [
							{
								id: "remote-2",
								variant: "posts",
								content: JSON.stringify({ content: "only pull", userId: "u1" }),
								updatedAt: 1_715_856_000_000,
								isDeleted: false,
							},
						],
						hasMore: false,
					}),
					{ status: 200 },
				),
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

		await db.sync.trigger()

		expect(await db.find("dirtyQueue")).toEqual([])
		const pushBody = fetchMock.mock.calls[1]?.[1]?.body as string
		expect(pushBody).toBeDefined()
		const payload = JSON.parse(pushBody)
		expect(payload).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ id: "remote-2", variant: "posts" })]),
		)
	})

	/** Confirms syncPush converts dirty records into the backend payload format and clears the dirty queue after a successful push. */
	test("pushes dirty records and clears queues on success", async () => {
		await db.put("posts", { id: "local-1", content: "needs sync", userId: "u1" })
		fetchMock.mockReset()
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

		await db.sync.trigger()

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
		expect(await db.find("dirtyQueue")).toHaveLength(0)
	})

	/** Confirms large dirty queues are pushed in multiple upsert-many batches. */
	test("chunks large dirty queues into multiple upsert-many requests", async () => {
		const tx = db.getTransaction()
		for (let i = 0; i < 45; i++) {
			tx.put("posts", { id: `bulk-${i}`, content: `post ${i}`, userId: "u1" })
		}
		await tx.commit()

		fetchMock.mockReset()
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
			)
			.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

		await db.sync.trigger()

		const pushCalls = fetchMock.mock.calls.filter((c) =>
			String(c[0]).includes("/api/posts/upsert-many"),
		)
		expect(pushCalls.length).toBeGreaterThanOrEqual(2)
		const pushedIds = pushCalls.flatMap((c) =>
			(JSON.parse(c[1]?.body as string) as { id: string }[])
				.filter((p) => p.id.startsWith("bulk-"))
				.map((p) => p.id),
		)
		expect(new Set(pushedIds).size).toBe(45)
		expect(await db.find("dirtyQueue")).toHaveLength(0)
	})

	/** Confirms delete tombstones are preserved for the backend and removed from the local dirty queue. */
	test("pushes deleted records as tombstones", async () => {
		await db.put("posts", { id: "local-2", content: "delete me", userId: "u1" })
		await db.delete("posts", "local-2")
		fetchMock.mockReset()
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

		await db.sync.trigger()

		const payload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string)
		expect(payload[0]).toMatchObject({
			id: "local-2",
			variant: "posts",
			content: "{}",
			isDeleted: true,
		})
		expect(await db.find("deletedQueue")).toHaveLength(0)
	})

	/** Confirms auth checks and login/logout state transitions map to the session endpoints. */
	test("auth lifecycle updates session state", async () => {
		await db.auth.logout()
		fetchMock.mockClear()
		fetchMock
			.mockResolvedValueOnce(new Response("", { status: 200 }))
			.mockResolvedValueOnce(new Response("", { status: 200 }))
			.mockResolvedValueOnce(new Response("", { status: 200 }))

		expect(await db.auth.revalidate()).toBe(true)
		await db.auth.login("user@example.com", "123456")
		expect(db.auth.isLoggedIn).toBe(true)
		await db.auth.logout()
		expect(db.auth.isLoggedIn).toBe(false)
		const urls = fetchMock.mock.calls.map((call) => String(call[0]))
		expect(urls.some((url) => url.includes("/api/session/login"))).toBe(true)
		expect(urls.some((url) => url.includes("/api/session/logout"))).toBe(true)
	})

	test("data APIs throw when not logged in", async () => {
		await db.auth.logout()
		await expect(db.get("posts", "x")).rejects.toThrow("not logged in")
	})

	test("sync skips pull/push while pendingLogout", async () => {
		const freshDb = await createDb(fetchMock)
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		await freshDb.auth.logout()
		fetchMock.mockClear()
		await freshDb.sync.trigger()
		expect(fetchMock).not.toHaveBeenCalled()
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		freshDb.dispose()
	})

	test("pull 401 invalidates session and stops sync", async () => {
		const freshDb = await createDb(fetchMock)
		writeIsLoggedIn(true)
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			}),
		)
		await freshDb.sync.start()
		expect(freshDb.sync.isStarted).toBe(true)
		expect(freshDb.auth.isLoggedIn).toBe(true)

		await freshDb.sync.trigger()

		expect(freshDb.auth.isLoggedIn).toBe(false)
		expect(freshDb.sync.isStarted).toBe(false)
		freshDb.dispose()
	})

	/** Confirms logout clears every table and resets cursor state so the browser starts fresh. */
	test("logout clears local tables and sync cursors", async () => {
		const freshDb = await createDb(fetchMock)
		await freshDb.put("posts", { id: "wipe-me", content: "before logout", userId: "u1" })
		localStorage.setItem("dbsync-lastSuccessAt", new Date().toISOString())
		localStorage.setItem("dbsync-pullSyncedUpTo", String(Date.parse("2026-05-17T00:00:00.000Z")))
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))

		await freshDb.auth.logout()

		expect(localStorage.getItem("dbsync-lastSuccessAt")).toBeNull()
		expect(localStorage.getItem("dbsync-pullSyncedUpTo")).toBeNull()
		await expect(freshDb.get("posts", "wipe-me")).rejects.toThrow("not logged in")

		writeIsLoggedIn(true)
		const afterLogout = await createDb(fetchMock)
		expect(await afterLogout.find("posts")).toEqual([])
		expect(await afterLogout.find("dirtyQueue")).toEqual([])
		afterLogout.dispose()
		freshDb.dispose()
	})
})
