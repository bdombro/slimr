import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync } from "./DbSync.js"
import { DbSyncHttpError } from "./errors.js"
import {
	readEmail,
	writeEmail,
	writeIsLoggedIn,
	writePendingLogout,
} from "./internal/authStorage.js"
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
		expect(db.auth.isReady).toBe(true)
		db.dispose()
	})

	test("LocalAdapter runs session flow and allows data APIs without login", async () => {
		const onAuthenticated = vi.fn()
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db, { onAuthenticated })
		await db.sync.start()
		await db.put("posts", { id: "1", title: "before-login" })
		await db.auth.login("dev@local", "000")
		await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalled())
		expect(db.auth.isLoggedIn).toBe(true)
		expect(db.auth.isReady).toBe(true)

		writeIsLoggedIn(true)
		const onRefresh = vi.fn()
		const db2 = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db2, { onAuthenticated: onRefresh })
		await db2.waitForBooted()
		expect(onRefresh).not.toHaveBeenCalled()
		expect(db2.auth.isReady).toBe(true)

		db.dispose()
		db2.dispose()
	})

	test("isLoggedIn$ subscribers can safely query the database after login", async () => {
		const onAuthenticated = vi.fn()
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db, { onAuthenticated })
		await db.sync.start()

		let querySucceeded = false
		db.auth.isLoggedIn$.subscribe(async (loggedIn) => {
			if (loggedIn) {
				await db.find("posts")
				querySucceeded = true
			}
		})

		await db.auth.login("dev@local", "000")
		await vi.waitFor(() => expect(querySucceeded).toBe(true))
		expect(db.auth.isReady).toBe(true)
		db.dispose()
	})

	test("data APIs throw when not logged in", async () => {
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db)
		await expect(db.put("posts", { id: "1", title: "x" })).rejects.toMatchObject({
			name: "DbSyncNotAuthenticatedError",
			code: "not_authenticated",
			severity: 2,
		})
		db.dispose()
	})

	test("sendCode throws when offline", async () => {
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db)
		await expect(db.auth.sendCode("a@b.com")).rejects.toMatchObject({
			name: "DbSyncOfflineError",
			code: "offline",
			severity: 0,
		})
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
		await expect(db.auth.login("a@b.com", "123")).rejects.toMatchObject({
			name: "DbSyncOfflineError",
			code: "offline",
			severity: 0,
		})
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
		await expect(db.auth.login("a@b.com", "123")).rejects.toMatchObject({
			name: "DbSyncHttpError",
			code: "pending_logout",
			severity: 2,
		})
		db.dispose()
	})

	test("email and email$ are null by default, are populated on login, saved to localStorage, hydrated on boot, cleared on logout, and synchronized across tabs", async () => {
		// 1. Null by default
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db)
		await db.sync.start()

		expect(db.auth.email$.val).toBeNull()
		expect(readEmail()).toBeNull()

		// 2. Populated on login and saved to localStorage
		await db.auth.login("test@example.com", "000")
		expect(db.auth.email$.val).toBe("test@example.com")
		expect(readEmail()).toBe("test@example.com")

		// 3. Hydrated on boot (refresh simulation)
		db.dispose()

		// Simulate page refresh with persisted email
		writeIsLoggedIn(true)
		writeEmail("test@example.com")

		const db2 = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(db2)
		await db2.waitForBooted()

		expect(db2.auth.email$.val).toBe("test@example.com")

		// 4. Cleared on logout
		await db2.auth.logout()
		expect(db2.auth.email$.val).toBeNull()
		expect(readEmail()).toBeNull()

		db2.dispose()
	})

	test("email and email$ are synchronized on cross-tab passive login and logout", async () => {
		const dbActive = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(dbActive)
		await dbActive.sync.start()

		const dbPassive = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		wireAuth(dbPassive)
		await dbPassive.waitForBooted()

		expect(dbPassive.auth.email$.val).toBeNull()

		// Simulate login on active tab causing passive login on second tab
		await dbActive.auth.login("passive@example.com", "000")
		expect(dbActive.auth.email$.val).toBe("passive@example.com")

		// Wait for passive login to propagate
		await vi.waitFor(() => expect(dbPassive.auth.email$.val).toBe("passive@example.com"))

		// Simulate logout on active tab causing passive logout on second tab
		await dbActive.auth.logout()
		expect(dbActive.auth.email$.val).toBeNull()

		// Wait for passive logout to propagate
		await vi.waitFor(() => expect(dbPassive.auth.email$.val).toBeNull())

		dbActive.dispose()
		dbPassive.dispose()
	})
})
