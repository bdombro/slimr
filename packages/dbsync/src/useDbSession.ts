import { useEffect, useState } from "react"
import type { DbSync } from "./DbSync.js"

export type DbSessionState = {
	isLoggedIn: boolean
	isBooted: boolean
	isBootstrapping: boolean
	isReady: boolean
	offline: boolean
	online: boolean
}

/**
 * Subscribes to session, boot, and connectivity state without polling.
 */
export function useDbSession(db: DbSync): DbSessionState {
	const [, bump] = useState(0)

	useEffect(() => {
		const sub = db.auth.onSessionChange(() => bump((n) => n + 1))
		return () => {
			sub.close()
		}
	}, [db])

	return {
		isLoggedIn: db.auth.isLoggedIn,
		isBooted: db.isBooted,
		isBootstrapping: db.auth.isBootstrapping,
		isReady: db.isReady,
		offline: db.offline,
		online: db.online,
	}
}
