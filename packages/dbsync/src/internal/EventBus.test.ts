import { afterEach, describe, expect, test, vi } from "vitest"
import { EventBus, type RowChange } from "./EventBus.js"

/** Verifies row-level change notifications and cross-tab broadcast behavior. */
describe("EventBus", () => {
	const changes: RowChange[] = [{ table: "posts", change: "update", id: "post-1" }]
	const channelInstances: Array<{
		onmessage: ((event: MessageEvent) => void) | null
		postMessage: ReturnType<typeof vi.fn>
	}> = []

	/** Restores BroadcastChannel after each case. */
	afterEach(() => {
		channelInstances.length = 0
		vi.unstubAllGlobals()
	})

	/** Installs a mock BroadcastChannel that records instances for cross-tab simulation. */
	const installMockBroadcastChannel = () => {
		class MockBroadcastChannel {
			public onmessage: ((event: MessageEvent) => void) | null = null
			public postMessage = vi.fn()
			constructor(_name: string) {
				channelInstances.push(this)
			}
			close() {}
		}
		vi.stubGlobal("BroadcastChannel", MockBroadcastChannel)
	}

	test("notifies updates$ subscribers with tables and changes", async () => {
		installMockBroadcastChannel()
		const bus = new EventBus("test")
		const callback = vi.fn()
		bus.updates$.subscribe(callback)
		bus.notifySubscribers(["posts"], changes)
		await vi.waitFor(() => expect(callback).toHaveBeenCalled())
		expect(callback).toHaveBeenCalledWith(
			expect.objectContaining({ tables: ["posts"], changes, txId: 1 }),
		)
		bus.dispose()
	})

	test("omits large change payloads from broadcast messages", async () => {
		installMockBroadcastChannel()
		const sourceBus = new EventBus("src")
		const targetBus = new EventBus("tgt")
		const targetCallback = vi.fn()
		targetBus.updates$.subscribe(targetCallback)

		const largeChanges = Array.from({ length: 101 }, (_, index) => ({
			table: "posts",
			change: "update" as const,
			id: `post-${index}`,
		}))
		sourceBus.notifySubscribers(["posts"], largeChanges)

		expect(channelInstances[0]?.postMessage).toHaveBeenCalledWith({
			type: "DATA_UPDATED",
			stores: ["posts"],
			changes: undefined,
		})

		channelInstances[1]?.onmessage?.({
			data: { type: "DATA_UPDATED", stores: ["posts"], changes: undefined },
		} as MessageEvent)
		await vi.waitFor(() => expect(targetCallback).toHaveBeenCalled())
		expect(targetCallback).toHaveBeenCalledWith(
			expect.objectContaining({ tables: ["posts"], changes: undefined }),
		)

		sourceBus.dispose()
		targetBus.dispose()
	})

	test("forwards AUTH_LOGIN and AUTH_LOGOUT to auth listeners", () => {
		installMockBroadcastChannel()
		const sourceBus = new EventBus("src")
		const targetBus = new EventBus("tgt")
		const authCallback = vi.fn()
		targetBus.onAuthMessage(authCallback)

		sourceBus.broadcastAuth("AUTH_LOGIN")
		expect(channelInstances[0]?.postMessage).toHaveBeenCalledWith({ type: "AUTH_LOGIN" })

		channelInstances[1]?.onmessage?.({ data: { type: "AUTH_LOGIN" } } as MessageEvent)
		expect(authCallback).toHaveBeenCalledWith("AUTH_LOGIN")

		sourceBus.broadcastAuth("AUTH_LOGOUT")
		channelInstances[1]?.onmessage?.({ data: { type: "AUTH_LOGOUT" } } as MessageEvent)
		expect(authCallback).toHaveBeenCalledWith("AUTH_LOGOUT")

		sourceBus.dispose()
		targetBus.dispose()
	})

	test("forwards broadcast changes to updates$ subscribers", async () => {
		installMockBroadcastChannel()
		const sourceBus = new EventBus("src")
		const targetBus = new EventBus("tgt")
		const targetCallback = vi.fn()
		targetBus.updates$.subscribe(targetCallback)

		sourceBus.notifySubscribers(["posts"], changes)
		expect(channelInstances[0]?.postMessage).toHaveBeenCalledWith({
			type: "DATA_UPDATED",
			stores: ["posts"],
			changes,
		})

		channelInstances[1]?.onmessage?.({
			data: { type: "DATA_UPDATED", stores: ["posts"], changes },
		} as MessageEvent)
		await vi.waitFor(() => expect(targetCallback).toHaveBeenCalled())
		expect(targetCallback).toHaveBeenCalledWith(
			expect.objectContaining({ tables: ["posts"], changes }),
		)

		sourceBus.dispose()
		targetBus.dispose()
	})

	test("publishes consecutive identical payloads when txId differs", async () => {
		const bus = new EventBus("seq")
		const callback = vi.fn()
		bus.updates$.subscribe(callback)
		const payload = [{ table: "posts", change: "update" as const, id: "1" }]
		bus.notifySubscribers(["posts"], payload)
		bus.notifySubscribers(["posts"], payload)
		await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(2))
		expect(callback.mock.calls[0][0].txId).toBe(1)
		expect(callback.mock.calls[1][0].txId).toBe(2)
		bus.dispose()
	})
})
