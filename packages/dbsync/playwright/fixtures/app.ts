import { LocalAdapter } from "../../src/adapters/LocalAdapter.js"
import { DbSync, DbTable } from "../../src/index.js"

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

window.db = db as unknown as Window["db"]
window.postsRepo = db.posts

void db.waitForBooted().then(() => {
	log("ready")
	db.updates$.subscribe(({ tables: stores }) => {
		log(`updated:${stores.join(",")}`)
		if (stores.includes("posts")) {
			db.posts.find().then((posts) => {
				window.latestPosts = posts
				log(`total:${posts.length}`)
			})
		}
	})
})
