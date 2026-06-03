import type { DbSyncError } from "./errors.js"

/** Sync engine state (mirrors `SyncState` on the event bus). */
export type DbSyncDebugSyncState = "idle" | "syncing" | "offline" | "error"

/** Structured debug events; consumed via `DbSyncConfig.onDebug`. */
export type DbSyncDebugEvent =
	| { type: "boot:start" }
	| { type: "boot:done"; isLoggedIn: boolean; isReady: boolean }
	| { type: "boot:failed"; error: DbSyncError }
	| { type: "session:start" }
	| { type: "session:authenticated" }
	| { type: "session:logout"; phase: "listeners" | "cleared" | "remote" }
	| {
			type: "sync:cycle"
			phase: "start" | "pull" | "push" | "done" | "skipped"
			reason?: "offline" | "auth"
			pullCount?: number
			pushCount?: number
	  }
	| { type: "sync:state"; state: DbSyncDebugSyncState }
	| { type: "sync:pull"; skipped: "pending-local"; table: string; id: string }
	| { type: "sync:pull"; stuck: true; cursor: string }
	| { type: "sync:error"; error: DbSyncError }
	| { type: "auth:invalidate"; reason: "401" | "revalidate" }
	| { type: "schema:reload" }
	| { type: "query:error"; tables: string[]; error: DbSyncError }

export type DbSyncDebugListener = (event: DbSyncDebugEvent) => void

export type DbSyncDebugListeners = {
	[K in DbSyncDebugEvent["type"]]?: (event: Extract<DbSyncDebugEvent, { type: K }>) => void
}
