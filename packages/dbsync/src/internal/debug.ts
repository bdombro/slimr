import type { DbSyncDebugEvent, DbSyncDebugListener, DbSyncDebugListeners } from "../debugEvents.js"
import type { DbSyncError, ErrorSeverity } from "../errors.js"

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

/** Safely normalizes any caught value to a DbSyncError instance, guaranteeing severity. */
export function toError(err: unknown): DbSyncError {
	let error: Error
	if (err instanceof Error) {
		error = err
	} else if (typeof err === "string") {
		error = new Error(err)
	} else {
		error = new Error(String(err))
	}

	const dbSyncError = error as DbSyncError & { severity: ErrorSeverity }
	if (dbSyncError.severity === undefined) {
		dbSyncError.severity = 1
	}

	return dbSyncError
}
