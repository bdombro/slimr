import { describe, expect, it } from "vitest"
import { FuzzIndex } from "./FuzzIndex.js"

interface Movie {
	id: string
	title: string
	description: string
}

const movieOptions = {
	extract: (m: Movie) => [{ value: m.title, weight: 1 }],
}

describe("FuzzIndex", () => {
	it("should find exact matches with highest score", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "The Matrix", description: "" },
			{ id: "2", title: "Matrix Reloaded", description: "" },
		])

		const results = await index.search("the matrix")

		expect(results.length).toBeGreaterThan(0)
		expect(results[0].item.id).toBe("1")
		expect(results[0].score).toBe(100) // Exact match * weight 1

		index.destroy()
	})

	it("should score word boundary matches higher than substring matches", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "Acool B", description: "" }, // substring match
			{ id: "2", title: "A cool B", description: "" }, // word boundary match
		])

		const results = await index.search("cool")

		expect(results).toHaveLength(2)
		expect(results[0].item.id).toBe("2")
		expect(results[0].score).toBe(50) // Word boundary
		expect(results[1].item.id).toBe("1")
		expect(results[1].score).toBe(25) // Substring

		index.destroy()
	})

	it("should score prefix matches higher than word boundary matches", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "The Cool Movie", description: "" }, // word boundary match
			{ id: "2", title: "Cool Runnings", description: "" }, // prefix match
		])

		const results = await index.search("cool")

		expect(results).toHaveLength(2)
		expect(results[0].item.id).toBe("2")
		expect(results[0].score).toBe(75) // Prefix match
		expect(results[1].item.id).toBe("1")
		expect(results[1].score).toBe(50) // Word boundary

		index.destroy()
	})

	it("should apply weights correctly across multiple fields", async () => {
		const index = new FuzzIndex<Movie>({
			extract: (m) => [
				{ value: m.title, weight: 2 },
				{ value: m.description, weight: 1 },
			],
		})

		index.add([
			{
				id: "1",
				title: "Matrix",
				description: "Something else",
			},
			{
				id: "2",
				title: "Something else",
				description: "A movie about the Matrix",
			},
		])

		const results = await index.search("matrix")

		expect(results).toHaveLength(2)
		// "Matrix" is an exact match (100) on title (weight 2) -> 200
		expect(results[0].item.id).toBe("1")
		expect(results[0].score).toBe(200)

		// "Matrix" is a word boundary match (50) on description (weight 1) -> 50
		expect(results[1].item.id).toBe("2")
		expect(results[1].score).toBe(50)

		index.destroy()
	})

	it("should chunk indexing without blocking", async () => {
		const index = new FuzzIndex<Movie>({
			...movieOptions,
			chunkSize: 2,
		})

		const items: Movie[] = []
		for (let i = 0; i < 5; i++) {
			items.push({ id: `${i}`, title: `Movie ${i}`, description: "" })
		}

		index.add(items)

		// Await search should wait for the background indexing to complete
		const results = await index.search("Movie 3")

		expect(results).toHaveLength(1)
		expect(results[0].item.id).toBe("3")

		index.destroy()
	})

	it("should accept a single item or an array in add()", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add({ id: "1", title: "Solo", description: "" })
		index.add([{ id: "2", title: "Batch", description: "" }])

		const results = await index.search("solo")

		expect(results).toHaveLength(1)
		expect(results[0].item.id).toBe("1")

		const batchResults = await index.search("batch")
		expect(batchResults).toHaveLength(1)
		expect(batchResults[0].item.id).toBe("2")

		index.destroy()
	})

	it("should return empty array for empty queries", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([{ id: "1", title: "Test", description: "" }])

		const results = await index.search("   ")

		expect(results).toHaveLength(0)

		index.destroy()
	})

	it("matchEmpty returns all indexed items for a blank query", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "Alpha", description: "" },
			{ id: "2", title: "Beta", description: "" },
		])

		await index.index()
		expect(index.searchSync("")).toHaveLength(0)
		expect(index.searchSync("", { matchEmpty: true })).toHaveLength(2)
		expect(index.searchSync("   ", { matchEmpty: true })).toHaveLength(2)

		index.destroy()
	})

	it("matchEmpty on the constructor applies to search without per-search override", async () => {
		const index = new FuzzIndex<Movie>({
			...movieOptions,
			matchEmpty: true,
		})

		index.add([
			{ id: "1", title: "Alpha", description: "" },
			{ id: "2", title: "Beta", description: "" },
		])

		await index.index()
		expect(index.searchSync("")).toHaveLength(2)
		expect(await index.search("   ")).toHaveLength(2)
		expect(index.searchSync("", { matchEmpty: false })).toHaveLength(0)

		index.destroy()
	})

	it("matchEmpty ranks items by recency boost when query is blank", async () => {
		const NOW = 1_700_000_000_000
		const DAY = 24 * 60 * 60 * 1000

		type Todo = { id: string; title: string; lastEditedAt: number }
		const index = new FuzzIndex<Todo>({
			now: NOW,
			extract: (todo) => [
				{ value: todo.title, weight: 1 },
				{ recency: todo.lastEditedAt, weight: 1 },
			],
		})

		index.add([
			{ id: "1", title: "task", lastEditedAt: NOW - 60 * DAY },
			{ id: "2", title: "task", lastEditedAt: NOW - DAY },
		])

		await index.index()
		const results = index.searchSync("", { matchEmpty: true })
		expect(results).toHaveLength(2)
		expect(results[0].item.id).toBe("2")
		expect(results[0].score).toBeGreaterThan(results[1].score)

		index.destroy()
	})

	it("searchSync should search only already-indexed items without awaiting", async () => {
		const index = new FuzzIndex<Movie>({
			...movieOptions,
			chunkSize: 2,
		})

		index.add([{ id: "1", title: "Movie 1", description: "" }])

		// Hasn't been indexed yet
		const syncResults1 = index.searchSync("Movie 1")
		expect(syncResults1).toHaveLength(0)

		// Await search to flush the queue into the index
		const asyncResults = await index.search("Movie 1")
		expect(asyncResults).toHaveLength(1)

		// Now searchSync should find it immediately
		const syncResults2 = index.searchSync("Movie 1")
		expect(syncResults2).toHaveLength(1)

		index.destroy()
	})

	it("pause stops ongoing indexing and preserves unprocessed queue", async () => {
		const index = new FuzzIndex<Movie>({
			...movieOptions,
			chunkSize: 1,
		})

		index.add([
			{ id: "0", title: "Movie 0", description: "" },
			{ id: "1", title: "Movie 1", description: "" },
			{ id: "2", title: "Movie 2", description: "" },
		])

		const indexing = index.index()
		const pausing = index.pause()
		await Promise.all([indexing, pausing])

		expect(index.searchSync("Movie 0")).toHaveLength(1)
		expect(index.searchSync("Movie 1")).toHaveLength(0)
		expect(index.searchSync("Movie 2")).toHaveLength(0)

		await index.resume()

		expect(index.searchSync("Movie 1")).toHaveLength(1)
		expect(index.searchSync("Movie 2")).toHaveLength(1)

		index.destroy()
	})

	it("pause stops the background indexing interval", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		await index.pause()

		index.add({ id: "1", title: "Late", description: "" })

		await new Promise((r) => setTimeout(r, 50))

		expect(index.searchSync("Late")).toHaveLength(0)

		await index.resume()

		expect(index.searchSync("Late")).toHaveLength(1)

		index.destroy()
	})

	it("remove drops indexed items from search results", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "The Matrix", description: "" },
			{ id: "2", title: "Inception", description: "" },
		])

		await index.index()
		expect(await index.search("matrix")).toHaveLength(1)

		index.remove("1")
		expect(index.searchSync("matrix")).toHaveLength(0)
		expect(await index.search("inception")).toHaveLength(1)

		index.destroy()
	})

	it("remove drops queued items before they are indexed", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "The Matrix", description: "" },
			{ id: "2", title: "Inception", description: "" },
		])

		index.remove("1")
		await index.index()

		expect(index.searchSync("matrix")).toHaveLength(0)
		expect(index.searchSync("inception")).toHaveLength(1)

		index.destroy()
	})

	it("remove accepts a single id or an array of ids", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "Alpha", description: "" },
			{ id: "2", title: "Beta", description: "" },
			{ id: "3", title: "Gamma", description: "" },
		])

		await index.index()

		index.remove(["1", "3"])
		const results = index.searchSync("a")

		expect(results).toHaveLength(1)
		expect(results[0].item.id).toBe("2")

		index.destroy()
	})

	it("remove by id uses default item.id without explicit getId", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add({ id: "1", title: "The Matrix", description: "" })
		await index.index()

		index.remove("1")
		expect(index.searchSync("matrix")).toHaveLength(0)

		index.destroy()
	})

	it("removeWhere removes items by predicate", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "Alpha", description: "" },
			{ id: "2", title: "Beta", description: "" },
		])

		await index.index()

		index.removeWhere((m) => m.title.startsWith("A"))
		expect(index.searchSync("alpha")).toHaveLength(0)
		expect(index.searchSync("beta")).toHaveLength(1)

		index.destroy()
	})

	it("add replaces queued items with the same id when getId is set", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add({ id: "1", title: "Old Title", description: "" })
		index.add({ id: "1", title: "New Title", description: "" })

		await index.index()

		const results = index.searchSync("new")
		expect(results).toHaveLength(1)
		expect(results[0].item.title).toBe("New Title")
		expect(index.searchSync("old")).toHaveLength(0)

		index.destroy()
	})

	it("add updates indexed items immediately when getId matches", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add({ id: "1", title: "Old Title", description: "" })
		await index.index()

		index.add({ id: "1", title: "New Title", description: "" })

		const results = index.searchSync("new")
		expect(results).toHaveLength(1)
		expect(results[0].item.title).toBe("New Title")
		expect(index.searchSync("old")).toHaveLength(0)

		index.destroy()
	})

	it("add does not deduplicate when items have no id", async () => {
		type TitleOnly = { title: string }
		const index = new FuzzIndex<TitleOnly>({
			extract: (t) => [{ value: t.title, weight: 1 }],
		})

		index.add([{ title: "Duplicate" }, { title: "Duplicate" }])

		await index.index()
		expect(index.searchSync("duplicate")).toHaveLength(2)

		index.destroy()
	})

	it("clear empties indexed and queued items", async () => {
		const index = new FuzzIndex<Movie>(movieOptions)

		index.add({ id: "1", title: "The Matrix", description: "" })
		await index.index()
		expect(index.searchSync("matrix")).toHaveLength(1)

		index.clear()
		expect(index.searchSync("matrix")).toHaveLength(0)

		index.add({ id: "2", title: "Inception", description: "" })
		expect(index.searchSync("inception")).toHaveLength(0)

		await index.index()
		expect(index.searchSync("inception")).toHaveLength(1)

		index.destroy()
	})

	it("custom getId overrides default item.id", async () => {
		type SlugItem = { slug: string; title: string }
		const index = new FuzzIndex<SlugItem>({
			getId: (item) => item.slug,
			extract: (item) => [{ value: item.title, weight: 1 }],
		})

		index.add({ slug: "a", title: "First" })
		index.add({ slug: "a", title: "Second" })
		await index.index()

		expect(index.searchSync("second")).toHaveLength(1)
		expect(index.searchSync("first")).toHaveLength(0)

		index.destroy()
	})

	it("search respects default limit and per-search limit override", async () => {
		const index = new FuzzIndex<Movie>({
			...movieOptions,
			limit: 2,
		})

		index.add([
			{ id: "1", title: "Alpha One", description: "" },
			{ id: "2", title: "Alpha Two", description: "" },
			{ id: "3", title: "Alpha Three", description: "" },
		])

		await index.index()

		expect(index.searchSync("alpha")).toHaveLength(2)
		expect(index.searchSync("alpha", { limit: 1 })).toHaveLength(1)
		expect(index.searchSync("alpha", { limit: 10 })).toHaveLength(3)

		index.destroy()
	})

	it("recency boost ranks recently edited items higher", async () => {
		const NOW = 1_700_000_000_000
		const DAY = 24 * 60 * 60 * 1000

		type Todo = { id: string; title: string; lastEditedAt: number }
		const index = new FuzzIndex<Todo>({
			now: NOW,
			extract: (todo) => [
				{ value: todo.title, weight: 1 },
				{ recency: todo.lastEditedAt, weight: 1 },
			],
		})

		index.add([
			{ id: "1", title: "buy milk", lastEditedAt: NOW - 60 * DAY },
			{ id: "2", title: "buy milk", lastEditedAt: NOW - DAY },
		])

		const results = await index.search("buy")
		expect(results).toHaveLength(2)
		expect(results[0].item.id).toBe("2")
		expect(results[0].score).toBeGreaterThan(results[1].score)

		index.destroy()
	})

	it("numeric boost ranks higher values higher when numericMax is set", async () => {
		type Task = { id: string; title: string; priority: number }
		const index = new FuzzIndex<Task>({
			numericMax: 10,
			extract: (task) => [
				{ value: task.title, weight: 1 },
				{ numeric: task.priority, weight: 1 },
			],
		})

		index.add([
			{ id: "1", title: "report", priority: 2 },
			{ id: "2", title: "report", priority: 9 },
		])

		const results = await index.search("report")
		expect(results[0].item.id).toBe("2")
		expect(results[0].score).toBeGreaterThan(results[1].score)

		index.destroy()
	})
})
