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
window.onLoginCount = 0
window.onLogoutCount = 0

const log = (message: string) => {
	window.logs.push(message)
	const content = document.getElementById("content")
	if (content) content.textContent = window.logs.join("\n")
}

const db = new AuthFixtureDb({
	adapter: new RestAdapter({ url: window.location.origin }),
})

window.db = db as unknown as Window["db"]
window.postsRepo = db.posts

window.getState = () => ({
	isLoggedIn: db.isLoggedIn,
	initted: db.initted,
	pendingLogout: db.pendingLogout,
	offline: db.offline,
	onLoginCount: window.onLoginCount,
	onLogoutCount: window.onLogoutCount,
})

window.seedLoggedIn = () => {
	writeIsLoggedIn(true)
}

db.onLogin(async () => {
	window.onLoginCount += 1
	await db.init()
	log(`onLogin:${window.onLoginCount}`)
})

db.onLogout(() => {
	window.onLogoutCount += 1
	log(`onLogout:${window.onLogoutCount}`)
})

log(`boot:${db.isLoggedIn}`)
db.bootstrapSession()
