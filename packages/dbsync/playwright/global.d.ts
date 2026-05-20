import type { DbRepository } from "../src/DbRepository.js"

interface FixturePost {
	id: string
	title: string
}

/** Subset of `DbSync` used in the browser fixture (includes test-only sync hooks). */
interface FixtureDb {
	triggerSync: () => Promise<unknown>
	syncEngine: {
		performSync: () => Promise<void>
	}
}

declare global {
	interface Window {
		logs: string[]
		db: FixtureDb
		postsRepo: DbRepository<FixturePost>
		latestPosts: FixturePost[]
		lockAcquiredTime: number
	}
}

export {}
