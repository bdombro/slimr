import type { DbAuthState } from "./authTypes.js"
import type { DbSync } from "./DbSync.js"
import { useDbAuth } from "./useDbAuth.js"

/** @deprecated Use `useDbAuth`. */
export function useDbSession(db: DbSync): DbAuthState {
	return useDbAuth(db)
}

export type { DbAuthState as DbSessionState } from "./authTypes.js"
