import { useEffect, useState } from "react"
import type { DbSync } from "./DbSync.js"

export type DbSessionState = {
	isLoggedIn: boolean
	isBootstrapping: boolean
	isDbReady: boolean
	offline: boolean
	online: boolean
}

/**
 * Subscribes to session, boot, and connectivity state without polling.
 */
export function useDbSession(db: DbSync): DbSessionState {
	const [, bump] = useState(0)

	useEffect(() => {
		const sub = db.onSessionChange(() => bump((n) => n + 1))
		return () => {
			sub.close()
		}
	}, [db])

	return {
		isLoggedIn: db.isLoggedIn,
		isBootstrapping: db.isBootstrapping,
		isDbReady: db.initted,
		offline: db.offline,
		online: db.online,
	}
}
