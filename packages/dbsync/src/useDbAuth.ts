import { useEffect, useState } from "react"
import type { DbAuthState } from "./authTypes.js"
import type { DbSync } from "./DbSync.js"

function readAuthState(db: DbSync): DbAuthState {
	return {
		phase: db.auth.phase,
		isLoggedIn: db.auth.isLoggedIn,
		isBooted: db.auth.isBooted,
		isReady: db.auth.isReady,
		isBootstrapping: db.auth.isBootstrapping,
		pendingLogout: db.auth.pendingLogout,
		offline: db.auth.offline,
		online: db.auth.online,
		syncState: db.auth.syncState,
	}
}

/**
 * Subscribes to `db.auth.onChange` and re-renders when session/auth/sync state changes.
 */
export function useDbAuth(db: DbSync): DbAuthState {
	const [state, setState] = useState(() => readAuthState(db))

	useEffect(() => {
		const sub = db.auth.onChange(() => setState(readAuthState(db)))
		return () => sub.close()
	}, [db])

	return state
}
