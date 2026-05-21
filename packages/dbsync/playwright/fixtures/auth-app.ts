import { RestAdapter } from "../../src/adapters/RestAdapter.js"
import { DbSync, DbTable } from "../../src/index.js"
import { writeIsLoggedIn } from "../../src/internal/authStorage.js"

interface Post {
	id: string
	title: string
}

class PostsTable extends DbTable<Post, { title: string }> {
	static tableName = "posts"

	id!: string
	title!: string
}

class AuthFixtureDb extends DbSync {
	posts = new PostsTable(this)
}

window.logs = []
window.onAuthenticatedCount = 0
window.onLogoutCount = 0

const log = (message: string) => {
	window.logs.push(message)
	const content = document.getElementById("content")
	if (content) content.textContent = window.logs.join("\n")
}

const db = new AuthFixtureDb({
	adapter: new RestAdapter({ url: window.location.origin }),
})

db.auth.onAuthenticated(async () => {
	window.onAuthenticatedCount += 1
	log(`onAuthenticated:${window.onAuthenticatedCount}`)
})

db.auth.onLogout(() => {
	window.onLogoutCount += 1
	log(`onLogout:${window.onLogoutCount}`)
})

window.db = db as unknown as Window["db"]
window.postsRepo = db.posts

window.getState = () => ({
	isLoggedIn: db.auth.isLoggedIn,
	isReady: db.isReady,
	pendingLogout: db.auth.pendingLogout,
	offline: db.offline,
	onAuthenticatedCount: window.onAuthenticatedCount,
	onLogoutCount: window.onLogoutCount,
})

window.seedLoggedIn = () => {
	writeIsLoggedIn(true)
}

log(`boot:${db.auth.isLoggedIn}`)
