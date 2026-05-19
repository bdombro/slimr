import { describe, expect, it } from "vitest"
import { FuzzIdIndex } from "./FuzzIdIndex.js"

interface Movie {
	id: string
	title: string
	description: string
	/** Large field that should not be retained in the id-only index */
	posterUrl: string
}

const movieOptions = {
	extract: (m: Movie) => [{ value: m.title, weight: 1 }],
}

describe("FuzzIdIndex", () => {
	it("returns id and score, not the full item", async () => {
		const index = new FuzzIdIndex<Movie>(movieOptions)

		index.add({
			id: "1",
			title: "The Matrix",
			description: "ignored at search time",
			posterUrl: "https://example.com/large.jpg",
		})

		await index.index()
		const results = index.searchSync("matrix")

		expect(results).toHaveLength(1)
		expect(results[0].id).toBe("1")
		expect(results[0].score).toBeGreaterThan(0)
		expect(results[0]).not.toHaveProperty("item")

		index.destroy()
	})

	it("remove drops indexed items from search results", async () => {
		const index = new FuzzIdIndex<Movie>(movieOptions)

		index.add([
			{ id: "1", title: "The Matrix", description: "", posterUrl: "" },
			{ id: "2", title: "Inception", description: "", posterUrl: "" },
		])

		await index.index()
		index.remove("1")

		expect(index.searchSync("matrix")).toHaveLength(0)
		expect(index.searchSync("inception")).toHaveLength(1)

		index.destroy()
	})

	it("add replaces existing items with the same id", async () => {
		const index = new FuzzIdIndex<Movie>(movieOptions)

		index.add({ id: "1", title: "Old Title", description: "", posterUrl: "" })
		index.add({ id: "1", title: "New Title", description: "", posterUrl: "" })

		await index.index()

		expect(index.searchSync("new")).toHaveLength(1)
		expect(index.searchSync("old")).toHaveLength(0)

		index.destroy()
	})

	it("throws when an item has no resolvable id", () => {
		const index = new FuzzIdIndex<{ title: string }>({
			extract: (t) => [{ value: t.title, weight: 1 }],
		})

		expect(() => index.add({ title: "No id" })).toThrow(/resolvable id/)
		index.destroy()
	})

	it("clear empties indexed and queued items", async () => {
		const index = new FuzzIdIndex<Movie>(movieOptions)

		index.add({ id: "1", title: "The Matrix", description: "", posterUrl: "" })
		await index.index()
		expect(index.searchSync("matrix")).toHaveLength(1)

		index.clear()
		expect(index.searchSync("matrix")).toHaveLength(0)

		index.destroy()
	})

	it("supports custom getId", async () => {
		type SlugItem = { slug: string; title: string }
		const index = new FuzzIdIndex<SlugItem>({
			getId: (item) => item.slug,
			extract: (item) => [{ value: item.title, weight: 1 }],
		})

		index.add({ slug: "a", title: "Hello" })
		await index.index()

		const results = index.searchSync("hello")
		expect(results[0].id).toBe("a")

		index.destroy()
	})
})
