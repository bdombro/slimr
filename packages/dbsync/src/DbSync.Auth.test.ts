import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync } from "./DbSync.js"
import { DbSyncAuthError, DbSyncNotAuthenticatedError, DbSyncOfflineError } from "./errors.js"
import { writeIsLoggedIn, writePendingLogout } from "./internal/authStorage.js"
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

	test("boot does not run onAuthenticated when hydrated", async () => {
		writeIsLoggedIn(true)
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))

		const onAuthenticated = vi.fn()
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db, { onAuthenticated })
		await db.waitForBooted()

		expect(onAuthenticated).not.toHaveBeenCalled()
		expect(db.isReady).toBe(true)
		db.dispose()
	})

	test("LocalAdapter runs session flow and allows data APIs without login", async () => {
		const onAuthenticated = vi.fn()
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db, { onAuthenticated })
		await db.start()
		await db.put("posts", { id: "1", title: "before-login" })
		await db.auth.login("dev@local", "000")
		await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalled())
		expect(db.isLoggedIn).toBe(true)
		expect(db.isReady).toBe(true)

		writeIsLoggedIn(true)
		const onRefresh = vi.fn()
		const db2 = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db2, { onAuthenticated: onRefresh })
		await db2.waitForBooted()
		expect(onRefresh).not.toHaveBeenCalled()
		expect(db2.isReady).toBe(true)

		db.dispose()
		db2.dispose()
	})

	test("data APIs throw when not logged in", async () => {
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db)
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
		wireAuth(db)
		await expect(db.auth.sendCode("a@b.com")).rejects.toBeInstanceOf(DbSyncOfflineError)
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		db.dispose()
	})

	test("sendCode delegates to adapter when online", async () => {
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db)
		await expect(db.auth.sendCode("a@b.com")).resolves.toBe(true)
		db.dispose()
	})

	test("login throws when offline", async () => {
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db)
		await expect(db.auth.login("a@b.com", "123")).rejects.toBeInstanceOf(DbSyncOfflineError)
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		db.dispose()
	})

	test("login throws when pendingLogout", async () => {
		writeIsLoggedIn(true)
		writePendingLogout(true)
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db)
		await expect(db.auth.login("a@b.com", "123")).rejects.toBeInstanceOf(DbSyncAuthError)
		db.dispose()
	})
})
