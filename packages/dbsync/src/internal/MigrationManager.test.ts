import { describe, expect, test, vi } from "vitest"
import { MigrationManager } from "./MigrationManager.js"

/** Verifies record migrations stay deterministic because old documents must upgrade in a known order. */
describe("MigrationManager", () => {
	/** Confirms migrations are applied in version order even when the input array is shuffled. */
	test("upgradeRecord sorts and applies migrations in ascending order", async () => {
		const applied: number[] = []
		const migrations = [
			{
				version: 2,
				note: "v2",
				upgrade: vi.fn(async (record: any) => {
					applied.push(2)
					record.step = 2
				}),
			},
			{
				version: 1,
				note: "v1",
				upgrade: vi.fn(async (record: any) => {
					applied.push(1)
					record.step = 1
				}),
			},
		]

		const upgraded = await MigrationManager.upgradeRecord(
			{ id: "1", storeVersion: 0 },
			migrations as any,
		)

		expect(applied).toEqual([1, 2])
		expect(upgraded.storeVersion).toBe(2)
		expect(upgraded.step).toBe(2)
	})

	/** Confirms runAll reads a store, upgrades changed records, and writes them back through the provided transaction. */
	test("runAll upgrades records and commits once", async () => {
		const put = vi.fn()
		const commit = vi.fn().mockResolvedValue(undefined)
		const db = {
			find: vi.fn().mockResolvedValue([{ id: "1", storeVersion: 0, name: "old" }]),
			getTransaction: vi.fn().mockReturnValue({ put, commit }),
		}
		const manager = new MigrationManager(db as any)

		await manager.runAll({
			posts: [
				{
					version: 1,
					note: "rename field",
					upgrade: async (record: any) => {
						record.name = "new"
					},
				},
			],
		})

		expect(db.find).toHaveBeenCalledWith("posts")
		expect(put).toHaveBeenCalledWith(
			"posts",
			expect.objectContaining({ id: "1", name: "new", storeVersion: 1 }),
			undefined,
			true,
		)
		expect(commit).toHaveBeenCalledTimes(1)
	})
})
