import { describe, expect, test, vi } from "vitest"
import { DbRepository } from "./DbRepository.js"

/** Verifies the repository wrapper is just a thin typed layer over DbSync so consumers get convenience without new semantics. */
describe("DbRepository", () => {
	/** Confirms each repository method delegates directly to the matching DbSync method. */
	test("delegates to DbSync methods", async () => {
		const db = {
			get: vi.fn().mockResolvedValue({ id: "1", name: "alpha" }),
			findAll: vi.fn().mockResolvedValue([{ id: "1", name: "alpha" }]),
			add: vi.fn().mockResolvedValue({ id: "2", name: "beta" }),
			applyDefaults: vi.fn().mockResolvedValue({ name: "delta" }),
			put: vi.fn().mockResolvedValue({ id: "1", name: "gamma" }),
			delete: vi.fn().mockResolvedValue(undefined),
			clear: vi.fn().mockResolvedValue(undefined),
		}
		const repo = new DbRepository<any>(db as any, "posts")

		expect(await repo.findById("1")).toEqual({ id: "1", name: "alpha" })
		expect(await repo.findAll()).toEqual([{ id: "1", name: "alpha" }])
		expect(await repo.add({ name: "beta" }, "2")).toEqual({ id: "2", name: "beta" })
		expect(await repo.applyDefaults({ name: "delta" })).toEqual({ name: "delta" })
		expect(await repo.put({ id: "1", name: "gamma" })).toEqual({ id: "1", name: "gamma" })
		await repo.delete("1")
		await repo.clear()

		expect(db.get).toHaveBeenCalledWith("posts", "1")
		expect(db.findAll).toHaveBeenCalledWith("posts")
		expect(db.add).toHaveBeenCalledWith("posts", { name: "beta" }, "2")
		expect(db.applyDefaults).toHaveBeenCalledWith("posts", { name: "delta" })
		expect(db.put).toHaveBeenCalledWith("posts", { id: "1", name: "gamma" }, undefined)
		expect(db.delete).toHaveBeenCalledWith("posts", "1")
		expect(db.clear).toHaveBeenCalledWith("posts")
	})
})
