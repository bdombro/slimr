import type { DbSyncDebugEvent, DbSyncDebugListener, DbSyncDebugListeners } from "../debugEvents.js"

/** Invokes event listener(s) when provided; no-op otherwise. */
export function emitDebug(
	events: DbSyncDebugListener | DbSyncDebugListeners | undefined,
	event: DbSyncDebugEvent,
) {
	if (!events) return
	if (typeof events === "function") {
		events(event)
	} else {
		const handler = events[event.type]
		if (handler) {
			try {
				;(handler as any)(event)
			} catch (e) {
				console.error(`Error in dbsync event listener for ${event.type}:`, e)
			}
		}
	}
}
