import { describe, expect, it } from "vitest"
import { FuzzIndex } from "./FuzzIndex.js"

interface Movie {
	id: string
	title: string
	description: string
}

describe("FuzzIndex", () => {
	it("should find exact matches with highest score", async () => {
		const index = new FuzzIndex<Movie>({
			extract: (m) => [{ value: m.title, weight: 1 }],
		})

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
		const index = new FuzzIndex<Movie>({
			extract: (m) => [{ value: m.title, weight: 1 }],
		})

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
		const index = new FuzzIndex<Movie>({
			extract: (m) => [{ value: m.title, weight: 1 }],
		})

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
			chunkSize: 2,
			extract: (m) => [{ value: m.title, weight: 1 }],
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
		const index = new FuzzIndex<Movie>({
			extract: (m) => [{ value: m.title, weight: 1 }],
		})

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
		const index = new FuzzIndex<Movie>({
			extract: (m) => [{ value: m.title, weight: 1 }],
		})

		index.add([{ id: "1", title: "Test", description: "" }])

		const results = await index.search("   ")

		expect(results).toHaveLength(0)

		index.destroy()
	})

	it("searchSync should search only already-indexed items without awaiting", async () => {
		const index = new FuzzIndex<Movie>({
			chunkSize: 2,
			extract: (m) => [{ value: m.title, weight: 1 }],
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
			chunkSize: 1,
			extract: (m) => [{ value: m.title, weight: 1 }],
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
		const index = new FuzzIndex<Movie>({
			extract: (m) => [{ value: m.title, weight: 1 }],
		})

		await index.pause()

		index.add({ id: "1", title: "Late", description: "" })

		await new Promise((r) => setTimeout(r, 50))

		expect(index.searchSync("Late")).toHaveLength(0)

		await index.resume()

		expect(index.searchSync("Late")).toHaveLength(1)

		index.destroy()
	})
})
