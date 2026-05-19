import { describe, expect, test, vi } from "vitest"
import { DbRepository } from "./DbRepository.js"

/** Verifies the repository wrapper is just a thin typed layer over DbSync so consumers get convenience without new semantics. */
describe("DbRepository", () => {
	/** Confirms each repository method delegates directly to the matching DbSync method. */
	test("delegates to DbSync methods", async () => {
		const db = {
			get: vi.fn().mockResolvedValue({ id: "1", name: "alpha" }),
			find: vi.fn().mockResolvedValue([{ id: "2", name: "beta" }]),
			getBy: vi.fn().mockResolvedValue({ id: "3", name: "gamma" }),
			stream: vi.fn().mockImplementation(async function* () {
				yield { id: "4", name: "delta" }
			}),
			add: vi.fn().mockResolvedValue({ id: "2", name: "beta" }),
			applyDefaults: vi.fn().mockResolvedValue({ name: "delta" }),
			put: vi.fn().mockResolvedValue({ id: "1", name: "gamma" }),
			delete: vi.fn().mockResolvedValue(undefined),
			clear: vi.fn().mockResolvedValue(undefined),
		}
		const repo = new DbRepository<any>(db as any, "posts")

		expect(await repo.get("1")).toEqual({ id: "1", name: "alpha" })
		expect(await repo.find({ limit: 1 })).toEqual([{ id: "2", name: "beta" }])
		expect(await repo.getBy("name", "gamma")).toEqual({ id: "3", name: "gamma" })
		expect(await Array.fromAsync(repo.stream({ order: "desc" }))).toEqual([
			{ id: "4", name: "delta" },
		])
		expect(await repo.add({ name: "beta" }, "2")).toEqual({ id: "2", name: "beta" })
		expect(await repo.applyDefaults({ name: "delta" })).toEqual({ name: "delta" })
		expect(await repo.put({ id: "1", name: "gamma" })).toEqual({ id: "1", name: "gamma" })
		await repo.delete("1")
		await repo.clear()

		expect(db.get).toHaveBeenCalledWith("posts", "1")
		expect(db.find).toHaveBeenCalledWith("posts", { limit: 1 })
		expect(db.getBy).toHaveBeenCalledWith("posts", "name", "gamma")
		expect(db.stream).toHaveBeenCalledWith("posts", { order: "desc" })
		expect(db.add).toHaveBeenCalledWith("posts", { name: "beta" }, "2")
		expect(db.applyDefaults).toHaveBeenCalledWith("posts", { name: "delta" })
		expect(db.put).toHaveBeenCalledWith("posts", { id: "1", name: "gamma" }, undefined)
		expect(db.delete).toHaveBeenCalledWith("posts", "1")
		expect(db.clear).toHaveBeenCalledWith("posts")
	})

	/** Confirms table-scoped subscribe filters global notifications to this table. */
	test("subscribe forwards only this table's row changes", () => {
		let subscriber: ((tables: string[], changes?: any[]) => void) | undefined
		const db = {
			subscribe: (callback: (tables: string[], changes?: any[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		const repo = new DbRepository<any>(db as any, "posts")
		const callback = vi.fn()
		repo.subscribe(callback)

		subscriber?.(
			["posts", "dirtyQueue"],
			[
				{ table: "posts", change: "update", id: "post-1" },
				{ table: "users", change: "insert", id: "user-1" },
			],
		)

		expect(callback).toHaveBeenCalledWith([{ change: "update", id: "post-1" }])
	})

	/** Confirms subscribe ignores notifications for other tables. */
	test("subscribe ignores unrelated tables", () => {
		let subscriber: ((tables: string[], changes?: any[]) => void) | undefined
		const db = {
			subscribe: (callback: (tables: string[], changes?: any[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		const repo = new DbRepository<any>(db as any, "posts")
		const callback = vi.fn()
		repo.subscribe(callback)

		subscriber?.(["users"], [{ table: "users", change: "update", id: "user-1" }])

		expect(callback).not.toHaveBeenCalled()
	})

	/** Confirms subscribe invokes callback with undefined when row detail is omitted. */
	test("subscribe passes undefined when changes are omitted", () => {
		let subscriber: ((tables: string[], changes?: any[]) => void) | undefined
		const db = {
			subscribe: (callback: (tables: string[], changes?: any[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		const repo = new DbRepository<any>(db as any, "posts")
		const callback = vi.fn()
		repo.subscribe(callback)

		subscriber?.(["posts"])

		expect(callback).toHaveBeenCalledWith(undefined)
	})

	/** Confirms optional id filtering skips irrelevant row updates. */
	test("subscribe can filter to specific record ids", () => {
		let subscriber: ((tables: string[], changes?: any[]) => void) | undefined
		const db = {
			subscribe: (callback: (tables: string[], changes?: any[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		const repo = new DbRepository<any>(db as any, "posts")
		const callback = vi.fn()
		repo.subscribe(callback, { ids: ["post-1"] })

		subscriber?.(["posts"], [{ table: "posts", change: "update", id: "post-2" }])
		expect(callback).not.toHaveBeenCalled()

		subscriber?.(["posts"], [{ table: "posts", change: "update", id: "post-1" }])
		expect(callback).toHaveBeenCalledWith([{ change: "update", id: "post-1" }])
	})
})
