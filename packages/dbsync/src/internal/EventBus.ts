export type SyncState = "idle" | "syncing" | "offline" | "error"

/** Describes a single row-level change in a user table. */
export type RowChange =
	| { table: string; change: "insert" | "update" | "delete"; id: string }
	| { table: string; change: "clear" }

/** Callback invoked when one or more tables change. */
export type SubscribeCallback = (tables: string[], changes?: RowChange[]) => void

/** Maximum row changes sent over BroadcastChannel before omitting the payload. */
const BROADCAST_CHANGES_CAP = 100

/**
 * Broadcasts store updates and sync state changes to local subscribers.
 */
export class EventBus {
	/** Subscribers that listen for store updates. */
	private subscribers = new Set<SubscribeCallback>()
	/** Subscribers that listen for sync state transitions. */
	private stateListeners = new Set<(state: SyncState) => void>()
	/** Broadcast channel used to mirror updates across tabs. */
	private bc =
		typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("dbsync_events") : null

	/** Auth message listeners (login/logout across tabs). */
	private authListeners = new Set<(type: "AUTH_LOGIN" | "AUTH_LOGOUT") => void>()

	/** Initializes the broadcast listener for cross-tab update propagation. */
	constructor() {
		if (this.bc) {
			this.bc.onmessage = (e) => {
				if (e.data.type === "DATA_UPDATED") {
					this.notifySubscribers(e.data.stores, e.data.changes, { skipBroadcast: true })
				} else if (e.data.type === "AUTH_LOGIN" || e.data.type === "AUTH_LOGOUT") {
					this.authListeners.forEach((cb) => cb(e.data.type))
				}
			}
		}
	}

	/** Subscribes to cross-tab auth events. */
	public onAuthMessage(callback: (type: "AUTH_LOGIN" | "AUTH_LOGOUT") => void) {
		this.authListeners.add(callback)
		return { close: () => this.authListeners.delete(callback) }
	}

	/** Broadcasts an auth state change to other tabs. */
	public broadcastAuth(type: "AUTH_LOGIN" | "AUTH_LOGOUT") {
		if (this.bc) this.bc.postMessage({ type })
	}

	/** Adds a store-update subscriber and returns a handle for removing it. */
	public subscribe(callback: SubscribeCallback) {
		this.subscribers.add(callback)
		return { close: () => this.subscribers.delete(callback) }
	}

	/** Notifies all store subscribers and mirrors the update to other tabs. */
	public notifySubscribers(
		stores: string[],
		changes?: RowChange[],
		options?: { skipBroadcast?: boolean },
	) {
		this.subscribers.forEach((cb) => cb(stores, changes))
		if (this.bc && !options?.skipBroadcast) {
			const broadcastChanges =
				changes && changes.length > BROADCAST_CHANGES_CAP ? undefined : changes
			this.bc.postMessage({ type: "DATA_UPDATED", stores, changes: broadcastChanges })
		}
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
