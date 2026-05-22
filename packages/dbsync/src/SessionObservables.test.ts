import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
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

describe("session observables", () => {
	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		localStorage.clear()
	})

	afterEach(async () => {
		localStorage.clear()
		await resetDatabase()
		vi.unstubAllGlobals()
	})

	test("initialSyncPending$ is true while booting when logged in", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({ adapter: new LocalAdapter(), tables: { posts: {} } })
		await db.waitForBooted()
		expect(db.auth.isLoggedIn).toBe(true)
		expect(db.auth.initialSyncPending$.val).toBe(true)
		expect(db.auth.isInitialSyncPending).toBe(true)
		db.dispose()
	})

	test("initialSyncPending$ clears after first successful sync", async () => {
		writeIsLoggedIn(true)
		const db = new DbSync({ adapter: new LocalAdapter(), tables: { posts: {} } })
		await db.waitForBooted()
		await db.sync.start()
		await db.sync.trigger()
		await vi.waitFor(() => expect(db.auth.initialSyncPending$.val).toBe(false))
		expect(db.auth.phase).toBe("ready")
		db.dispose()
	})
})
