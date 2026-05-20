import { createContext, type ReactNode, useContext, useEffect } from "react"
import type { DbSync } from "./DbSync.js"
import { useDbSession } from "./useDbSession.js"

const DbContext = createContext<DbSync | null>(null)

export type DbProviderProps = {
	db: DbSync
	children: ReactNode
	fallback?: ReactNode
	onLogin: () => void | Promise<void>
	onLogout: () => void | Promise<void>
}

/**
 * Optional convenience: registers session hooks, calls `bootstrapSession()`, provides `db` via context.
 */
export function DbProvider({ db, children, fallback, onLogin, onLogout }: DbProviderProps) {
	useEffect(() => {
		const loginSub = db.onLogin(onLogin)
		const logoutSub = db.onLogout(onLogout)
		db.bootstrapSession()
		return () => {
			loginSub.close()
			logoutSub.close()
		}
	}, [db, onLogin, onLogout])

	const { isLoggedIn, isDbReady } = useDbSession(db)

	if (fallback !== undefined && isLoggedIn && !isDbReady) {
		return <DbContext.Provider value={db}>{fallback}</DbContext.Provider>
	}

	return <DbContext.Provider value={db}>{children}</DbContext.Provider>
}

/** Returns the `DbSync` instance from the nearest `DbProvider`. */
export function useDb(): DbSync {
	const db = useContext(DbContext)
	if (!db) throw new Error("useDb must be used within DbProvider")
	return db
}
