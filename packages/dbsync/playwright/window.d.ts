export {}

declare global {
	interface Window {
		db: {
			syncEngine: { performSync: () => Promise<void> }
			triggerSync: () => Promise<unknown>
		}
		lockAcquiredTime: number
		logs: string[]
		latestPosts: Array<{ id: string; title: string }>
		postsRepo: { put: (row: { id: string; title: string }) => Promise<unknown> }
	}
}
