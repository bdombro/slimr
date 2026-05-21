import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { LocalAdapter } from "./adapters/LocalAdapter.js"
import { DbSync } from "./DbSync.js"
import { writeIsLoggedIn } from "./internal/authStorage.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"

const resetDatabase = async () => {
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase("dbsync")
		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
		request.onblocked = () => resolve()
	})
}

describe("DbSync autoStart", () => {
	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		localStorage.clear()
	})

	afterEach(async () => {
		localStorage.clear()
		await resetDatabase()
	})

	test("defaults autoStart to true and starts on boot", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		expect(db.autoStart).toBe(true)
		await db.boot()
		expect(db.initted).toBe(true)
		expect(db.isStarted).toBe(true)
		db.dispose()
	})

	test("autoStart false does not start until onLogin calls start", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			autoStart: false,
		})
		expect(db.autoStart).toBe(false)
		await db.boot()
		expect(db.initted).toBe(false)
		expect(db.isStarted).toBe(false)

		db.onLogin(async () => {
			await db.start()
		})
		await db.login("dev@local", "000")
		expect(db.initted).toBe(true)
		expect(db.isStarted).toBe(true)
		db.dispose()
	})

	test("autoBoot runs boot when onLogout is registered", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		db.onLogout(() => {})
		await db.whenReady()
		expect(db.initted).toBe(true)
		db.dispose()
	})

	test("autoBoot false requires explicit boot", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
			autoBoot: false,
		})
		db.onLogout(() => {})
		await new Promise<void>((resolve) => setTimeout(resolve, 0))
		expect(db.initted).toBe(false)
		await db.boot()
		expect(db.initted).toBe(true)
		db.dispose()
	})

	test("whenReady resolves after auto boot", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		db.onLogout(() => {})
		await db.whenReady()
		expect(db.initted).toBe(true)
		db.dispose()
	})

	test("whenBooted alias resolves like whenReady", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		db.onLogout(() => {})
		await db.whenBooted()
		expect(db.initted).toBe(true)
		db.dispose()
	})

	test("autoStart runs before app onLogin handlers", async () => {
		writeIsLoggedIn(true)
		const order: string[] = []
		const db = new DbSync({
			adapter: new LocalAdapter(),
			tables: { posts: {} },
		})
		db.onLogin(async () => {
			order.push(`app:${db.initted}`)
		})
		await db.boot()
		expect(order).toEqual(["app:true"])
		db.dispose()
	})
})
