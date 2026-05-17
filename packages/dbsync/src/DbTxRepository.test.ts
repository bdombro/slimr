import { describe, expect, test, vi } from "vitest"
import { DbTxRepository } from "./DbTxRepository.js"

describe("DbTxRepository", () => {
	test("delegates writes to DbTransaction methods", () => {
		const tx = {
			add: vi.fn(),
			put: vi.fn(),
			delete: vi.fn(),
			clear: vi.fn(),
			commit: vi.fn(),
			cancel: vi.fn(),
		}
		const repo = new DbTxRepository<any>(tx as any, "posts")

		repo.add({ name: "beta" }, "2")
		repo.put({ id: "1", name: "gamma" })
		repo.delete("1")
		repo.clear()

		expect(tx.add).toHaveBeenCalledWith("posts", { name: "beta" }, "2")
		expect(tx.put).toHaveBeenCalledWith("posts", { id: "1", name: "gamma" }, undefined)
		expect(tx.delete).toHaveBeenCalledWith("posts", "1")
		expect(tx.clear).toHaveBeenCalledWith("posts")
	})
})
