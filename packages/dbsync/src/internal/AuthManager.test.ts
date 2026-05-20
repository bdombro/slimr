import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { BackendAdapter } from "../adapters/types.js"
import { DbSyncOfflineError } from "../errors.js"
import { installIndexedDbTestShim } from "../test-support/indexeddb.js"
import { AuthManager } from "./AuthManager.js"
import { writeIsLoggedIn, writePendingLogout } from "./authStorage.js"
import { ConnectivityTracker } from "./ConnectivityTracker.js"
import { EventBus } from "./EventBus.js"
import { StorageManager } from "./storage/index.js"

const resetDatabase = async () => {
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase("dbsync")
		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
		request.onblocked = () => resolve()
	})
}

const createAdapter = (overrides?: Partial<BackendAdapter>): BackendAdapter => ({
	requiresAuth: true,
	checkAuth: vi.fn(async () => true),
	login: vi.fn(async () => true),
	logout: vi.fn(async () => {}),
	pull: vi.fn(async () => ({ items: [], hasMore: false })),
	push: vi.fn(async () => {}),
	...overrides,
})

describe("AuthManager", () => {
	let storage: StorageManager
	let events: EventBus
	let connectivity: ConnectivityTracker
	let auth: AuthManager

	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		localStorage.clear()
		events = new EventBus()
		connectivity = new ConnectivityTracker()
		storage = new StorageManager(
			{ adapter: createAdapter(), tables: { posts: {} } },
			events,
			() => {},
			() => [{ storeName: "posts", indexes: undefined }],
		)
		auth = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
	})

	afterEach(async () => {
		events.dispose()
		await resetDatabase()
		localStorage.clear()
		vi.restoreAllMocks()
	})

	test("hydrates isLoggedIn from localStorage", () => {
		writeIsLoggedIn(true)
		const hydrated = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
		expect(hydrated.isLoggedIn).toBe(true)
	})

	test("login throws when offline", async () => {
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const offlineConnectivity = new ConnectivityTracker() // reads navigator.onLine at construct
		const offlineAuth = new AuthManager(
			createAdapter(),
			storage,
			events,
			offlineConnectivity,
			() => {},
		)
		await expect(offlineAuth.login("a@b.com", "123")).rejects.toBeInstanceOf(DbSyncOfflineError)
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
	})

	test("bootstrapSession fires onLogin when hydrated", async () => {
		writeIsLoggedIn(true)
		const manager = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
		const onLogin = vi.fn(async () => {})
		manager.onLogin(onLogin)
		manager.bootstrapSession()
		await vi.waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1))
	})

	test("bootstrapSession does not fire onLogin when logged out", async () => {
		const manager = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
		const onLogin = vi.fn()
		manager.onLogin(onLogin)
		manager.bootstrapSession()
		expect(onLogin).not.toHaveBeenCalled()
	})

	test("canSync is false while pendingLogout", async () => {
		writeIsLoggedIn(true)
		writePendingLogout(true)
		const manager = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
		expect(manager.canSync()).toBe(false)
	})

	test("passive AUTH_LOGOUT does not call adapter.logout", async () => {
		const adapter = createAdapter()
		const channelInstances: Array<{ onmessage: ((event: MessageEvent) => void) | null }> = []
		class MockBroadcastChannel {
			onmessage: ((event: MessageEvent) => void) | null = null
			postMessage = vi.fn((data: unknown) => {
				channelInstances.forEach((ch) => ch.onmessage?.({ data } as MessageEvent))
			})
			close() {}
			constructor(_name: string) {
				channelInstances.push(this)
			}
		}
		vi.stubGlobal("BroadcastChannel", MockBroadcastChannel)

		const eventsA = new EventBus()
		const eventsB = new EventBus()
		const authA = new AuthManager(adapter, storage, eventsA, connectivity, () => {})
		const authB = new AuthManager(adapter, storage, eventsB, connectivity, () => {})

		writeIsLoggedIn(true)
		await storage.init()
		eventsA.broadcastAuth("AUTH_LOGOUT")
		await vi.waitFor(() => expect(authB.isLoggedIn).toBe(false))

		expect(adapter.logout).not.toHaveBeenCalled()
		eventsA.dispose()
		eventsB.dispose()
		vi.unstubAllGlobals()
	})

	test("AUTH_LOGIN on passive tab runs onLogin", async () => {
		const channelInstances: Array<{ onmessage: ((event: MessageEvent) => void) | null }> = []
		class MockBroadcastChannel {
			onmessage: ((event: MessageEvent) => void) | null = null
			postMessage = vi.fn((data: unknown) => {
				channelInstances.forEach((ch) => ch.onmessage?.({ data } as MessageEvent))
			})
			close() {}
			constructor(_name: string) {
				channelInstances.push(this)
			}
		}
		vi.stubGlobal("BroadcastChannel", MockBroadcastChannel)

		const eventsA = new EventBus()
		const eventsB = new EventBus()
		const authB = new AuthManager(createAdapter(), storage, eventsB, connectivity, () => {})
		const onLogin = vi.fn()
		authB.onLogin(onLogin)

		eventsA.broadcastAuth("AUTH_LOGIN")
		await vi.waitFor(() => expect(onLogin).toHaveBeenCalled())
		expect(authB.isLoggedIn).toBe(true)

		eventsA.dispose()
		eventsB.dispose()
		vi.unstubAllGlobals()
	})

	test("flushPendingRemoteLogout runs adapter.logout when back online", async () => {
		const adapter = createAdapter()
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const offlineConnectivity = new ConnectivityTracker()
		writeIsLoggedIn(true)
		writePendingLogout(true)
		new AuthManager(adapter, storage, events, offlineConnectivity, () => {})

		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
		window.dispatchEvent(new Event("online"))
		await vi.waitFor(() => expect(adapter.logout).toHaveBeenCalled())
		expect(localStorage.getItem("dbsync-pendingLogout")).toBeNull()
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
	})

	test("invalidateSession clears login and fires onLogout", async () => {
		const adapter = createAdapter({ checkAuth: vi.fn(async () => false) })
		writeIsLoggedIn(true)
		await storage.init()
		const manager = new AuthManager(adapter, storage, events, connectivity, () => {})
		const onLogout = vi.fn()
		manager.onLogout(onLogout)
		await manager.revalidateSession()
		expect(manager.isLoggedIn).toBe(false)
		expect(onLogout).toHaveBeenCalled()
	})

	test("logout clears local data and defers remote logout when offline", async () => {
		const adapter = createAdapter()
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const offlineConnectivity = new ConnectivityTracker()
		writeIsLoggedIn(true)
		const manager = new AuthManager(adapter, storage, events, offlineConnectivity, () => {})
		await storage.init()
		await storage.executeTransaction([
			{ type: "put", storeName: "posts", value: { id: "1", content: "x" } },
		])

		const onLogout = vi.fn()
		manager.onLogout(onLogout)
		await manager.logout()

		expect(onLogout).toHaveBeenCalled()
		expect(manager.isLoggedIn).toBe(false)
		expect(await storage.find("posts")).toEqual([])
		expect(localStorage.getItem("dbsync-pendingLogout")).toBe("true")
		expect(adapter.logout).not.toHaveBeenCalled()
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
	})
})
