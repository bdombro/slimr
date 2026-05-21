import type { DbSync } from "../DbSync.js"

/** Registers noop logout and optional authenticated listener (call right after `new DbSync`). */
export function wireAuth(
	db: DbSync,
	options?: {
		onLogout?: () => void | Promise<void>
		onAuthenticated?: () => void | Promise<void>
	},
) {
	db.auth.onLogout(options?.onLogout ?? (async () => {}))
	if (options?.onAuthenticated) {
		db.auth.onAuthenticated(options.onAuthenticated)
	}
}
