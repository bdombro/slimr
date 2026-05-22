import { useEffect, useState } from "react"
import type { DbSync } from "./DbSync.js"

export type DbSessionState = {
	isLoggedIn: boolean
	isBooted: boolean
	isBootstrapping: boolean
	isReady: boolean
	isInitialSyncPending: boolean
	offline: boolean
	online: boolean
}

/**
 * Subscribes to session, boot, sync completion, and connectivity state without polling.
 */
export function useDbSession(db: DbSync): DbSessionState {
	const [, bump] = useState(0)

	useEffect(() => {
		const sessionSub = db.auth.onSessionChange(() => bump((n) => n + 1))
		const syncSub = db.onSyncStateChange(() => bump((n) => n + 1))
		const offLogout = db.auth.onLogout(() => bump((n) => n + 1))
		return () => {
			sessionSub.close()
			syncSub.close()
			offLogout()
		}
	}, [db])

	return {
		isLoggedIn: db.auth.isLoggedIn,
		isBooted: db.isBooted,
		isBootstrapping: db.auth.isBootstrapping,
		isReady: db.isReady,
		isInitialSyncPending: db.isInitialSyncPending,
		offline: db.offline,
		online: db.online,
	}
}
