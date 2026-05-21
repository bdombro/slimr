import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { RestAdapter } from "./adapters/RestAdapter.js"
import { DbSync } from "./DbSync.js"
import { writeIsLoggedIn } from "./internal/authStorage.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"

const noopAuth = { onLogout: async () => {} }

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

	test("automatic lifecycle starts on boot when hydrated with auth", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			auth: noopAuth,
		})
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
			auth: noopAuth,
		})
		await expect(db.boot()).rejects.toThrow(/lifecycle\.manual/)
		db.dispose()
	})

	test("lifecycle manual does not start until boot", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			auth: noopAuth,
			lifecycle: { manual: true },
		})
		await new Promise<void>((resolve) => setTimeout(resolve, 0))
		expect(db.isReady).toBe(false)
		await db.boot()
		await db.start()
		expect(db.isReady).toBe(true)
		db.dispose()
	})

	test("local adapter without auth auto-starts on microtask", async () => {
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
			auth: noopAuth,
		})
		await db.waitForBooted()
		expect(db.isLoggedIn).toBe(true)
		expect(db.isBooted).toBe(true)
		db.dispose()
	})

	test("waitForBooted leaves isLoggedIn false when logged out", async () => {
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			auth: noopAuth,
		})
		await db.waitForBooted()
		expect(db.isLoggedIn).toBe(false)
		expect(db.isBooted).toBe(true)
		expect(db.isReady).toBe(false)
		db.dispose()
	})

	test("onAuthenticated runs after internal start", async () => {
		writeIsLoggedIn(true)
		const order: string[] = []
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			auth: {
				...noopAuth,
				onAuthenticated: async () => {
					order.push(`app:${db.isReady}`)
				},
			},
		})
		await db.waitForBooted()
		expect(order).toEqual(["app:true"])
		db.dispose()
	})

	test("RestAdapter requires auth.onLogout", () => {
		expect(
			() =>
				new DbSync({
					adapter: new RestAdapter({ url: "http://localhost:3000" }),
					tables: { posts: {} },
				}),
		).toThrow(/auth\.onLogout/)
	})
})
