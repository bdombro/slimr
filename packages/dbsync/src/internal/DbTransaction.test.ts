import { describe, expect, test, vi } from "vitest"
import { DbTransaction } from "./DbTransaction.js"

/** Verifies buffered transaction semantics so callers can compose writes before a single commit. */
describe("DbTransaction", () => {
	/** Confirms commit passes queued operations to the executor and cancel drops pending work. */
	test("delegates commit and supports cancel", async () => {
		const executor = vi.fn().mockResolvedValue(undefined)
		const tx = new DbTransaction(executor)

		tx.put("posts", { id: "1", content: "hello" })
		tx.delete("users", "u1")
		await tx.commit()

		expect(executor).toHaveBeenCalledWith([
			{ type: "put", storeName: "posts", value: { id: "1", content: "hello" }, key: undefined },
			{ type: "delete", storeName: "users", key: "u1" },
		])

		const cancelTx = new DbTransaction(executor)
		cancelTx.put("posts", { id: "2", content: "discard me" })
		cancelTx.cancel()
		await cancelTx.commit()

		expect(executor).toHaveBeenCalledTimes(1)
	})
})
