import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync } from "./DbSync.js"
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
		expect(db.isBooted).toBe(true)
		expect(db.isReady).toBe(true)
		expect(db.isStarted).toBe(true)
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
		expect(db.isReady).toBe(false)
		await db.boot()
		await db.start()
		expect(db.isReady).toBe(true)
		db.dispose()
	})

	test("local adapter without auth listeners auto-starts on microtask", async () => {
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		await vi.waitFor(() => expect(db.isReady).toBe(true))
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
		expect(db.isLoggedIn).toBe(true)
		expect(db.isBooted).toBe(true)
		db.dispose()
	})

	test("waitForBooted leaves isLoggedIn false when logged out", async () => {
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		wireAuth(db)
		await db.waitForBooted()
		expect(db.isLoggedIn).toBe(false)
		expect(db.isBooted).toBe(true)
		expect(db.isReady).toBe(false)
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
				order.push(`app:${db.isReady}`)
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
		expect(db.isReady).toBe(true)
		db.dispose()
	})

	test("RestAdapter constructs without auth listeners", () => {
		const db = new DbSync({
			adapter: new RestAdapter({ url: "http://localhost:3000" }),
			tables: { posts: {} },
		})
		db.dispose()
	})
})
