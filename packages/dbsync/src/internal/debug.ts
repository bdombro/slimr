import type { DbSyncDebugEvent, DbSyncDebugListener } from "../debugEvents.js"

/** Invokes `onDebug` when provided; no-op otherwise. */
export function emitDebug(onDebug: DbSyncDebugListener | undefined, event: DbSyncDebugEvent) {
	onDebug?.(event)
}
