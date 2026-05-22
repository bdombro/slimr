import { Observable } from "@slimr/observable"

export type SyncState = "idle" | "syncing" | "offline" | "error"

/** Describes a single row-level change in a user table. */
export type RowChange =
	| { table: string; change: "insert" | "update" | "delete"; id: string }
	| { table: string; change: "clear" }

/** Payload emitted on `updates$` after local or cross-tab data changes. */
export type DbUpdatesPayload = {
	tables: string[]
	changes?: RowChange[]
	/** Monotonic id so consecutive identical payloads still publish (Observable deep-equals). */
	txId: number
}

/** Maximum row changes sent over BroadcastChannel before omitting the payload. */
const BROADCAST_CHANGES_CAP = 100

/**
 * Broadcasts store updates and sync state changes via observables.
 */
export class EventBus {
	readonly state$: Observable<SyncState>
	readonly updates$: Observable<DbUpdatesPayload>

	private updateSeq = 0
	/** Broadcast channel used to mirror updates across tabs. */
	private bc =
		typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("dbsync_events") : null

	/** Auth message listeners (login/logout across tabs). */
	private authListeners = new Set<(type: "AUTH_LOGIN" | "AUTH_LOGOUT") => void>()

	/**
	 * @param instanceId Unique id for observable debug names.
	 */
	constructor(instanceId: string) {
		const prefix = `dbsync-${instanceId}`
		this.state$ = new Observable(`${prefix}-eventSyncState`, "idle")
		this.updates$ = new Observable(`${prefix}-updates`, { tables: [], txId: 0 })

		if (this.bc) {
			this.bc.onmessage = (e) => {
				if (e.data.type === "DATA_UPDATED") {
					this.emitUpdate(e.data.stores, e.data.changes, { skipBroadcast: true })
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

	/** Notifies `updates$` and mirrors the update to other tabs. */
	public notifySubscribers(
		stores: string[],
		changes?: RowChange[],
		options?: { skipBroadcast?: boolean },
	) {
		this.emitUpdate(stores, changes, options)
	}

	private emitUpdate(
		stores: string[],
		changes?: RowChange[],
		options?: { skipBroadcast?: boolean },
	) {
		const txId = ++this.updateSeq
		void this.updates$.set({ tables: stores, changes, txId })
		if (this.bc && !options?.skipBroadcast) {
			const broadcastChanges =
				changes && changes.length > BROADCAST_CHANGES_CAP ? undefined : changes
			this.bc.postMessage({ type: "DATA_UPDATED", stores, changes: broadcastChanges })
		}
	}

	/** Broadcasts a sync-state transition on `state$`. */
	public setState(state: SyncState) {
		void this.state$.set(state)
	}

	/** Tears down the broadcast channel and stops cross-tab propagation. */
	public dispose() {
		if (this.bc) {
			this.bc.close()
			this.bc = null
		}
	}
}
