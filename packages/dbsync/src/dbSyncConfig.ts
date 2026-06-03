import type { BackendAdapter } from "./adapters/types.js"
import type { DbSyncDebugListener, DbSyncDebugListeners } from "./debugEvents.js"
import type { Migration } from "./internal/MigrationManager.js"

export type {
	DbSyncDebugEvent,
	DbSyncDebugListener,
	DbSyncDebugListeners,
	DbSyncDebugSyncState,
} from "./debugEvents.js"

export interface DbSyncTableConfig {
	indexes?: string[]
	defaultSetter?: (value: any) => any
	migrations?: Migration[]
}

export interface DbSyncConfig {
	adapter: BackendAdapter
	/** Escape hatch; omit for normal apps. */
	lifecycle?: {
		manual?: boolean
	}
	version?: number
	tables?: Record<string, DbSyncTableConfig>
	/** Optional structured event listeners. Can be a catch-all callback or a type-safe listeners object. */
	events?: DbSyncDebugListener | DbSyncDebugListeners
}
