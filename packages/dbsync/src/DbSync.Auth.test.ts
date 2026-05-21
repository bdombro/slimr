import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync } from "./DbSync.js"
import { DbSyncNotAuthenticatedError, DbSyncOfflineError } from "./errors.js"
import { writeIsLoggedIn, writePendingLogout } from "./internal/authStorage.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"

const resetDatabase = async () => {
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase("dbsync")
		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
		request.onblocked = () => resolve()
	})
}

describe("DbSync auth integration", () => {
	let fetchMock: ReturnType<typeof vi.fn>

	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		localStorage.clear()
		fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)
	})

	afterEach(async () => {
		localStorage.clear()
		await resetDatabase()
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	test("boot runs onLogin when hydrated", async () => {
		writeIsLoggedIn(true)
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))

		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		const onLogin = vi.fn(async () => {
			await db.init()
		})
		db.onLogin(onLogin)
		await db.boot()

		expect(onLogin).toHaveBeenCalled()
		expect(db.initted).toBe(true)
		db.dispose()
	})

	test("LocalAdapter runs session flow and allows data APIs without login", async () => {
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		const onLogin = vi.fn(async () => {
			await db.init()
		})
		db.onLogin(onLogin)
		await db.init()
		await db.put("posts", { id: "1", title: "before-login" })
		await db.login("dev@local", "000")
		await vi.waitFor(() => expect(onLogin).toHaveBeenCalled())
		expect(db.isLoggedIn).toBe(true)
		expect(db.initted).toBe(true)

		writeIsLoggedIn(true)
		const db2 = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		const bootLogin = vi.fn(async () => {
			await db2.init()
		})
		db2.onLogin(bootLogin)
		await db2.boot()
		expect(bootLogin).toHaveBeenCalled()

		db.dispose()
		db2.dispose()
	})

	test("data APIs throw when not logged in", async () => {
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		await expect(db.put("posts", { id: "1", title: "x" })).rejects.toBeInstanceOf(
			DbSyncNotAuthenticatedError,
		)
		db.dispose()
	})

	test("sendCode throws when offline", async () => {
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		await expect(db.sendCode("a@b.com")).rejects.toBeInstanceOf(DbSyncOfflineError)
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		db.dispose()
	})

	test("sendCode works offline with LocalAdapter", async () => {
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		await expect(db.sendCode("a@b.com")).resolves.toBe(true)
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		db.dispose()
	})

	test("login throws when offline", async () => {
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		await expect(db.login("a@b.com", "123")).rejects.toBeInstanceOf(DbSyncOfflineError)
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		db.dispose()
	})

	test("triggerSync reports offline sync state when browser is offline", async () => {
		writeIsLoggedIn(true)
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
		)

		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		await db.init()

		const states: string[] = []
		db.onSyncStateChange((state) => states.push(state))
		await db.triggerSync()

		expect(states).toContain("offline")
		expect(fetchMock).not.toHaveBeenCalled()
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		db.dispose()
	})

	test("login blocked while pendingLogout", async () => {
		writeIsLoggedIn(true)
		writePendingLogout(true)
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })

		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		await expect(db.login("a@b.com", "123")).rejects.toThrow(/pending/)
		db.dispose()
	})
})
