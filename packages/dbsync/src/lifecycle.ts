import type { BackendAdapter } from "./adapters/types.js"
import type { DbSyncConfig } from "./dbSyncConfig.js"

export type LifecyclePolicy = {
	requiresAuth: boolean
	manual: boolean
	autoBoot: boolean
	autoStart: boolean
}

/** Infers automatic boot/start from the adapter and config (not user-facing flags). */
export function resolveLifecyclePolicy(
	adapter: BackendAdapter,
	config: DbSyncConfig,
): LifecyclePolicy {
	const requiresAuth = adapter.requiresAuth !== false
	const manual = config.lifecycle?.manual === true
	return {
		requiresAuth,
		manual,
		autoStart: !manual,
		autoBoot: !manual,
	}
}
