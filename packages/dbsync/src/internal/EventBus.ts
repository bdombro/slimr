export type SyncState = "idle" | "syncing" | "offline" | "error"

/**
 * Broadcasts store updates and sync state changes to local subscribers.
 */
export class EventBus {
	/** Subscribers that listen for store updates. */
	private subscribers = new Set<(stores: string[]) => void>()
	/** Subscribers that listen for sync state transitions. */
	private stateListeners = new Set<(state: SyncState) => void>()
	/** Broadcast channel used to mirror updates across tabs. */
	private bc =
		typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("dbsync_events") : null

	/** Initializes the broadcast listener for cross-tab update propagation. */
	constructor() {
		if (this.bc) {
			this.bc.onmessage = (e) => {
				if (e.data.type === "DATA_UPDATED") {
					this.notifySubscribers(e.data.stores)
				}
			}
		}
	}

	/** Adds a store-update subscriber and returns a handle for removing it. */
	public subscribe(callback: (stores: string[]) => void) {
		this.subscribers.add(callback)
		return { close: () => this.subscribers.delete(callback) }
	}

	/** Notifies all store subscribers and mirrors the update to other tabs. */
	public notifySubscribers(stores: string[]) {
		this.subscribers.forEach((cb) => cb(stores))
		if (this.bc) this.bc.postMessage({ type: "DATA_UPDATED", stores })
	}

	/** Adds a sync-state subscriber and returns a handle for removing it. */
	public onSyncStateChange(callback: (state: SyncState) => void) {
		this.stateListeners.add(callback)
		return { close: () => this.stateListeners.delete(callback) }
	}

	/** Broadcasts a sync-state transition to all subscribers. */
	public setState(state: SyncState) {
		this.stateListeners.forEach((cb) => cb(state))
	}

	/** Tears down the broadcast channel and stops cross-tab propagation. */
	public dispose() {
		if (this.bc) {
			this.bc.close()
			this.bc = null
		}
	}
}
