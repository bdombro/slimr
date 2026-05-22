import type { Observable } from "@slimr/observable"
import type { DbSync } from "./DbSync.js"
import type { DbSyncAuth } from "./DbSyncAuth.js"
import type { DbSyncDebugEvent } from "./dbSyncConfig.js"
import type { DbUpdatesPayload } from "./internal/EventBus.js"

/**
 * Structural db type for `DbTable` / `DbRepository` and field initializers
 * (`posts = new PostsTable(this)` on `DbSync` or `DbSyncR` subclasses).
 *
 * Narrower than `DbSync` so React overrides on `auth`, `sync`, and `updates$`
 * do not block subclass field initialization.
 */
export type DbSyncLikeType = Pick<
	DbSync,
	| "genUuid"
	| "get"
	| "find"
	| "getBy"
	| "stream"
	| "add"
	| "applyDefaults"
	| "put"
	| "delete"
	| "patch"
	| "clear"
	| "registerTable"
> & {
	readonly updates$: Pick<Observable<DbUpdatesPayload>, "subscribe" | "val">
}

/** `wireAuth` and similar helpers that only touch auth listeners. */
export type DbSyncWireAuthHost = DbSyncLikeType & {
	readonly auth: Pick<DbSyncAuth, "onLogout" | "onAuthenticated">
}

/** `useDbQuery` and other hooks that read auth + `updates$`. */
export type DbSyncQueryHost = DbSyncLikeType & {
	readonly auth: Pick<DbSyncAuth, "canQuery" | "canQuery$">
	emitDebug: (event: DbSyncDebugEvent) => void
}
