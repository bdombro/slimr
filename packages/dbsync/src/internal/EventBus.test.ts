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

	test("notifies subscribers with tables and changes", () => {
		installMockBroadcastChannel()
		const bus = new EventBus()
		const callback = vi.fn()
		bus.subscribe(callback)
		bus.notifySubscribers(["posts"], changes)
		expect(callback).toHaveBeenCalledWith(["posts"], changes)
		bus.dispose()
	})

	test("omits large change payloads from broadcast messages", () => {
		installMockBroadcastChannel()
		const sourceBus = new EventBus()
		const targetBus = new EventBus()
		const targetCallback = vi.fn()
		targetBus.subscribe(targetCallback)

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
		expect(targetCallback).toHaveBeenCalledWith(["posts"], undefined)

		sourceBus.dispose()
		targetBus.dispose()
	})

	test("forwards AUTH_LOGIN and AUTH_LOGOUT to auth listeners", () => {
		installMockBroadcastChannel()
		const sourceBus = new EventBus()
		const targetBus = new EventBus()
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

	test("forwards broadcast changes to subscribers", () => {
		installMockBroadcastChannel()
		const sourceBus = new EventBus()
		const targetBus = new EventBus()
		const targetCallback = vi.fn()
		targetBus.subscribe(targetCallback)

		sourceBus.notifySubscribers(["posts"], changes)
		expect(channelInstances[0]?.postMessage).toHaveBeenCalledWith({
			type: "DATA_UPDATED",
			stores: ["posts"],
			changes,
		})

		channelInstances[1]?.onmessage?.({
			data: { type: "DATA_UPDATED", stores: ["posts"], changes },
		} as MessageEvent)
		expect(targetCallback).toHaveBeenCalledWith(["posts"], changes)

		sourceBus.dispose()
		targetBus.dispose()
	})
})
