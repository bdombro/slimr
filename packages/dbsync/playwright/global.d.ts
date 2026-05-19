import type { DbRepository } from "../src/DbRepository.js"
import type { DbSync } from "../src/DbSync.js"

interface FixturePost {
	id: string
	title: string
}

declare global {
	interface Window {
		logs: string[]
		db: DbSync
		postsRepo: DbRepository<FixturePost>
		latestPosts: FixturePost[]
	}
}

export {}
