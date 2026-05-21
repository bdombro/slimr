import type { BackendAdapter } from "./adapters/types.js"
import type { Migration } from "./internal/MigrationManager.js"

export type DbAuthConfig = {
	onLogout: () => void | Promise<void>
	onAuthenticated?: () => void | Promise<void>
}

export interface DbSyncTableConfig {
	indexes?: string[]
	defaultSetter?: (value: any) => any
	migrations?: Migration[]
}

export interface DbSyncConfig {
	adapter: BackendAdapter
	auth?: DbAuthConfig
	/** Escape hatch; omit for normal apps. */
	lifecycle?: {
		manual?: boolean
	}
	version?: number
	tables?: Record<string, DbSyncTableConfig>
}
