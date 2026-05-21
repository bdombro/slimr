import type { BackendAdapter } from "./adapters/types.js"
import type { Migration } from "./internal/MigrationManager.js"

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
}
