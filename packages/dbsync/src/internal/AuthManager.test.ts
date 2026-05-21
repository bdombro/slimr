import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { LocalAdapter } from "../adapters/LocalAdapter.js"
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
	sendCode: vi.fn(async () => true),
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

	test("sendCode throws when offline", async () => {
		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const offlineConnectivity = new ConnectivityTracker()
		const adapter = createAdapter()
		const offlineAuth = new AuthManager(adapter, storage, events, offlineConnectivity, () => {})
		await expect(offlineAuth.sendCode("a@b.com")).rejects.toBeInstanceOf(DbSyncOfflineError)
		expect(adapter.sendCode).not.toHaveBeenCalled()
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
	})

	test("sendCode delegates to adapter when online", async () => {
		const adapter = createAdapter()
		const manager = new AuthManager(adapter, storage, events, connectivity, () => {})
		await expect(manager.sendCode("a@b.com")).resolves.toBe(true)
		expect(adapter.sendCode).toHaveBeenCalledWith("a@b.com")
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

	test("boot awaits onLogin when hydrated", async () => {
		writeIsLoggedIn(true)
		const manager = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
		let finished = false
		const onAuthenticated = vi.fn(async () => {
			finished = true
		})
		manager.onAuthenticated(onAuthenticated)
		await manager.boot()
		expect(onAuthenticated).toHaveBeenCalledTimes(1)
		expect(finished).toBe(true)
	})

	test("boot does not fire onLogin when logged out", async () => {
		const manager = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
		const onAuthenticated = vi.fn()
		manager.onAuthenticated(onAuthenticated)
		await manager.boot()
		expect(onAuthenticated).not.toHaveBeenCalled()
	})

	test("concurrent boot shares one onLogin run", async () => {
		writeIsLoggedIn(true)
		const manager = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
		let release!: () => void
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const onAuthenticated = vi.fn(async () => {
			await gate
		})
		manager.onAuthenticated(onAuthenticated)
		const first = manager.boot()
		const second = manager.boot()
		await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1))
		release()
		await Promise.all([first, second])
		expect(onAuthenticated).toHaveBeenCalledTimes(1)
	})

	test("login during boot awaits in-flight onLogin", async () => {
		writeIsLoggedIn(true)
		const adapter = createAdapter()
		const manager = new AuthManager(adapter, storage, events, connectivity, () => {})
		const order: string[] = []
		let releaseBoot!: () => void
		const bootGate = new Promise<void>((resolve) => {
			releaseBoot = resolve
		})
		manager.onAuthenticated(async () => {
			order.push("onLogin-start")
			await bootGate
			order.push("onLogin-end")
		})
		const bootDone = manager.boot()
		await vi.waitFor(() => expect(order).toContain("onLogin-start"))
		const loginDone = manager.login("a@b.com", "123")
		releaseBoot()
		await bootDone
		await loginDone
		expect(order).toEqual(["onLogin-start", "onLogin-end"])
		expect(adapter.login).toHaveBeenCalled()
	})

	test("boot rejects when onLogin throws", async () => {
		writeIsLoggedIn(true)
		const manager = new AuthManager(createAdapter(), storage, events, connectivity, () => {})
		manager.onAuthenticated(async () => {
			throw new Error("boot failed")
		})
		await expect(manager.boot()).rejects.toThrow("boot failed")
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
		const onAuthenticated = vi.fn()
		authB.onAuthenticated(onAuthenticated)

		eventsA.broadcastAuth("AUTH_LOGIN")
		await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalled())
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

	test("LocalAdapter runs session APIs while skipping assertAuthenticated", async () => {
		const adapter = new LocalAdapter()
		const manager = new AuthManager(adapter, storage, events, connectivity, () => {})
		const onAuthenticated = vi.fn()
		const onLogout = vi.fn()
		manager.onAuthenticated(onAuthenticated)
		manager.onLogout(onLogout)

		manager.assertAuthenticated()

		Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
		const offlineConnectivity = new ConnectivityTracker()
		const offlineAuth = new AuthManager(adapter, storage, events, offlineConnectivity, () => {})
		offlineAuth.onAuthenticated(onAuthenticated)
		await offlineAuth.login("dev@local", "000")
		expect(offlineAuth.isLoggedIn).toBe(true)
		expect(onAuthenticated).toHaveBeenCalled()
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true })

		writeIsLoggedIn(true)
		const boot = new AuthManager(adapter, storage, events, connectivity, () => {})
		const bootLogin = vi.fn()
		boot.onAuthenticated(bootLogin)
		await boot.boot()
		expect(bootLogin).toHaveBeenCalled()

		await storage.init()
		await manager.logout()
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
