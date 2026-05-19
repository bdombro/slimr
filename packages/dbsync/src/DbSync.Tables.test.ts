import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { DbSync } from "./DbSync.js"
import { DbTable } from "./DbTable.js"
import { installIndexedDbTestShim } from "./test-support/indexeddb.js"

let nextId = 0

class PostsTable extends DbTable<{ id: string; title: string }, { title: string }> {
	static tableName = "posts"
	static indexes = ["title"]

	id!: string
	title!: string

	prepareCreate(input: { title: string }) {
		return { ...super.prepareCreate(input), title: input.title.trim() }
	}
}

class MyAppDatabase extends DbSync {
	posts = new PostsTable(this)

	override genUuid() {
		nextId += 1
		return `post-${nextId}`
	}
}

type MyAppTransaction = ReturnType<MyAppDatabase["getTransaction"]> & {
	posts: {
		add(value: { title: string }): void
		commit(): Promise<void>
	}
}

describe("DbSync tables", () => {
	let db: MyAppDatabase

	const resetDatabase = async () => {
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.deleteDatabase("dbsync")
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
			request.onblocked = () => resolve()
		})
	}

	beforeEach(async () => {
		installIndexedDbTestShim()
		await resetDatabase()
		db = new MyAppDatabase({
			adapter: {} as any,
			version: 1,
		})
		await db.init()
	})

	afterEach(() => {
		db.dispose()
	})

	test("creates stores from runtime tables and normalizes writes", async () => {
		expect(db.posts).toBeInstanceOf(PostsTable)
		expect(db.posts.tableName).toBe("posts")

		await db.posts.add({ title: "  hello world  " })
		expect(await db.find("posts")).toEqual([{ id: "post-1", title: "hello world" }])

		const tx = db.getTransaction() as MyAppTransaction
		tx.posts.add({ title: "  from tx  " })
		await tx.commit()

		expect(await db.find("posts")).toEqual([
			{ id: "post-1", title: "hello world" },
			{ id: "post-2", title: "from tx" },
		])
	})
})
