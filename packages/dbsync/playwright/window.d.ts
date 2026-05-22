export {}

import type { DbAuthPhase, SyncState } from "../src/authTypes.js"

/** Minimal `DbSync` surface exposed to Playwright fixture pages. */
type PlaywrightDb = {
	sync: {
		trigger: () => Promise<void>
		setPerformSyncHook: (fn: (() => Promise<void>) | null) => void
	}
	auth: {
		phase: DbAuthPhase
		isLoggedIn: boolean
		isReady: boolean
		pendingLogout: boolean
		offline: boolean
		syncState: SyncState
		login: (email: string, code: string) => Promise<void>
		logout: () => Promise<void>
	}
	waitForBooted: () => Promise<void>
	get: (tableName: string, id: string) => Promise<unknown>
}

declare global {
	interface Window {
		db: PlaywrightDb
		lockAcquiredTime: number
		logs: string[]
		latestPosts: Array<{ id: string; title: string }>
		postsRepo: { put: (row: { id: string; title: string }) => Promise<unknown> }
		onAuthenticatedCount: number
		onLogoutCount: number
		getState: () => {
			phase: DbAuthPhase
			isLoggedIn: boolean
			isReady: boolean
			pendingLogout: boolean
			offline: boolean
			syncState: SyncState
			onAuthenticatedCount: number
			onLogoutCount: number
		}
		seedLoggedIn: () => void
	}
}
