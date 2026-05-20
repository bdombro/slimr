export {}

/** Minimal `DbSync` surface exposed to Playwright fixture pages. */
type PlaywrightDb = {
	syncEngine?: { performSync: () => Promise<void> }
	triggerSync: () => Promise<unknown>
	isLoggedIn: boolean
	initted: boolean
	pendingLogout: boolean
	offline: boolean
	login: (email: string, code: string) => Promise<void>
	logout: () => Promise<void>
	init: () => Promise<void>
	bootstrapSession: () => void
	get: (tableName: string, id: string) => Promise<unknown>
}

declare global {
	interface Window {
		db: PlaywrightDb
		lockAcquiredTime: number
		logs: string[]
		latestPosts: Array<{ id: string; title: string }>
		postsRepo: { put: (row: { id: string; title: string }) => Promise<unknown> }
		onLoginCount: number
		onLogoutCount: number
		getState: () => {
			isLoggedIn: boolean
			initted: boolean
			pendingLogout: boolean
			offline: boolean
			onLoginCount: number
			onLogoutCount: number
		}
		seedLoggedIn: () => void
	}
}
