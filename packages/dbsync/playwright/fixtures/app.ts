import { LocalAdapter } from "../../src/adapters/LocalAdapter.ts"
import { DbSync, DbTable } from "../../src/index.ts"

interface Post {
	id: string
	title: string
}

class PostsTable extends DbTable<Post, { title: string }> {
	static tableName = "posts"

	id!: string
	title!: string
}

class FixtureDb extends DbSync {
	posts = new PostsTable(this)
}

window.logs = []

const log = (message: string) => {
	window.logs.push(message)
	const content = document.getElementById("content")
	if (content) content.textContent = window.logs.join("\n")
}

const db = new FixtureDb({
	adapter: new LocalAdapter(),
})

window.db = db
window.postsRepo = db.posts

db.init().then(() => {
	log("ready")
	db.subscribe((stores) => {
		log(`updated:${stores.join(",")}`)
		if (stores.includes("posts")) {
			db.posts.getAll().then((posts) => {
				window.latestPosts = posts
				log(`total:${posts.length}`)
			})
		}
	})
})
