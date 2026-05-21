export {}

/** Minimal `DbSync` surface exposed to Playwright fixture pages. */
type PlaywrightDb = {
	syncEngine: { performSync: () => Promise<void> }
	triggerSync: () => Promise<unknown>
	isLoggedIn: boolean
	isReady: boolean
	pendingLogout: boolean
	offline: boolean
	auth: {
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
			isLoggedIn: boolean
			isReady: boolean
			pendingLogout: boolean
			offline: boolean
			onAuthenticatedCount: number
			onLogoutCount: number
		}
		seedLoggedIn: () => void
	}
}
