export type SyncState = "idle" | "syncing" | "offline" | "error"

export class EventBus {
	private subscribers = new Set<(stores: string[]) => void>()
	private stateListeners = new Set<(state: SyncState) => void>()
	private bc =
		typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("dbsync_events") : null

	constructor() {
		if (this.bc) {
			this.bc.onmessage = (e) => {
				if (e.data.type === "DATA_UPDATED") {
					this.notifySubscribers(e.data.stores)
				}
			}
		}
	}

	public subscribe(callback: (stores: string[]) => void) {
		this.subscribers.add(callback)
		return { close: () => this.subscribers.delete(callback) }
	}

	public notifySubscribers(stores: string[]) {
		this.subscribers.forEach((cb) => cb(stores))
		if (this.bc) this.bc.postMessage({ type: "DATA_UPDATED", stores })
	}

	public onSyncStateChange(callback: (state: SyncState) => void) {
		this.stateListeners.add(callback)
		return { close: () => this.stateListeners.delete(callback) }
	}

	public setState(state: SyncState) {
		this.stateListeners.forEach((cb) => cb(state))
	}

	public dispose() {
		if (this.bc) {
			this.bc.close()
			this.bc = null
		}
	}
}
