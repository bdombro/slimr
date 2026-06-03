import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync, type DbSyncDebugEvent } from "./DbSync.js"
import { writeIsLoggedIn } from "./internal/authStorage.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"
import { wireAuth } from "./test-support/wireAuth.js"

const resetDatabase = async () => {
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase("dbsync")
		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
		request.onblocked = () => resolve()
	})
}

describe("DbSync lifecycle", () => {
	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		localStorage.clear()
	})

	afterEach(async () => {
		localStorage.clear()
		await resetDatabase()
	})

	test("automatic lifecycle starts on boot when hydrated with auth listeners", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db)
		await db.waitForBooted()
		expect(db.auth.isBooted).toBe(true)
		expect(db.auth.isReady).toBe(true)
		expect(db.sync.isStarted).toBe(true)
		db.dispose()
	})

	test("boot() throws when lifecycle is automatic", async () => {
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db)
		await expect(db.boot()).rejects.toThrow(/lifecycle\.manual/)
		db.dispose()
	})

	test("lifecycle manual does not start until boot", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			lifecycle: { manual: true },
		})
		wireAuth(db)
		await new Promise<void>((resolve) => setTimeout(resolve, 0))
		expect(db.auth.isReady).toBe(false)
		await db.boot()
		await db.sync.start()
		expect(db.auth.isReady).toBe(true)
		db.dispose()
	})

	test("local adapter without auth listeners auto-starts on microtask", async () => {
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		await vi.waitFor(() => expect(db.auth.isReady).toBe(true))
		db.dispose()
	})

	test("waitForBooted leaves isLoggedIn true when hydrated", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db)
		await db.waitForBooted()
		expect(db.auth.isLoggedIn).toBe(true)
		expect(db.auth.isBooted).toBe(true)
		db.dispose()
	})

	test("waitForBooted leaves isLoggedIn false when logged out", async () => {
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db)
		await db.waitForBooted()
		expect(db.auth.isLoggedIn).toBe(false)
		expect(db.auth.isBooted).toBe(true)
		expect(db.auth.isReady).toBe(false)
		db.dispose()
	})

	test("onAuthenticated runs after internal start on login", async () => {
		const order: string[] = []
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db, {
			onAuthenticated: async () => {
				order.push(`app:${db.auth.isReady}`)
			},
		})
		await db.waitForBooted()
		expect(order).toEqual([])
		await db.auth.login("dev@local", "000")
		expect(order).toEqual(["app:true"])
		db.dispose()
	})

	test("boot does not call onAuthenticated when hydrated", async () => {
		writeIsLoggedIn(true)
		const onAuthenticated = vi.fn()
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db, { onAuthenticated })
		await db.waitForBooted()
		expect(onAuthenticated).not.toHaveBeenCalled()
		expect(db.auth.isReady).toBe(true)
		db.dispose()
	})

	test("RestAdapter constructs without auth listeners", () => {
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		db.dispose()
	})

	test("emits events to a wildcard callback function", async () => {
		writeIsLoggedIn(true)
		const events: DbSyncDebugEvent[] = []
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			events: (e) => events.push(e),
		})
		wireAuth(db)
		await db.waitForBooted()

		// Verify we captured the main boot events and initial sync states
		expect(events.map((e) => e.type)).toContain("boot:start")
		expect(events.map((e) => e.type)).toContain("boot:done")
		expect(events.map((e) => e.type)).toContain("sync:state")
		db.dispose()
	})

	test("emits events to specific listeners in an events object", async () => {
		writeIsLoggedIn(true)
		const bootStart = vi.fn()
		const bootDone = vi.fn()
		const syncState = vi.fn()

		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			events: {
				"boot:start": bootStart,
				"boot:done": bootDone,
				"sync:state": syncState,
			},
		})
		wireAuth(db)
		await db.waitForBooted()

		expect(bootStart).toHaveBeenCalled()
		expect(bootDone).toHaveBeenCalledWith(
			expect.objectContaining({ type: "boot:done", isLoggedIn: true }),
		)
		expect(syncState).toHaveBeenCalled()
		db.dispose()
	})
})
