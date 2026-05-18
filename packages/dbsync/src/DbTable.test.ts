import { describe, expect, test, vi } from "vitest"
import { DbTable } from "./DbTable.js"

describe("DbTable", () => {
	test("reads static metadata and injects an id by default", () => {
		const registerTable = vi.fn()
		const db = {
			genUuid: () => "generated-id",
			registerTable,
			add: vi.fn(async (_storeName: string, value: any) => value),
			put: vi.fn(async (_storeName: string, value: any) => value),
			patch: vi.fn(async (_storeName: string, value: any) => value),
		} as any

		class UsersTable extends DbTable<{ id: string; email: string }, { email: string }> {
			static tableName = "users"
			static indexes = ["email"]

			id!: string
			email!: string
		}

		const table = new UsersTable(db)

		expect(UsersTable.tableName).toBe("users")
		expect(UsersTable.indexes).toEqual(["email"])
		expect(registerTable).toHaveBeenCalledWith(table)
		expect(table.prepareCreate({ email: "user@example.com" })).toEqual({
			id: "generated-id",
			email: "user@example.com",
		})
	})

	test("routes add/put/patch through prepare hooks", async () => {
		const registerTable = vi.fn()
		const db = {
			genUuid: () => "generated-id",
			registerTable,
			storage: {
				executeTransaction: vi.fn(async (operations: any[]) =>
					operations.map((operation) => ({ value: operation.value })),
				),
			},
		} as any

		class UsersTable extends DbTable<{ id: string; email: string }, { email: string }> {
			static tableName = "users"
			id!: string
			email!: string

			prepareCreate(input: { email: string }) {
				const next = super.prepareCreate(input)
				return { ...next, email: next.email.toUpperCase() }
			}

			preparePut(input: { id: string; email: string }) {
				return { ...input, email: input.email.toUpperCase() }
			}

			preparePatch(input: { id: string; email?: string }) {
				return input.email ? { ...input, email: input.email.toUpperCase() } : input
			}
		}

		const table = new UsersTable(db)

		await table.add({ email: "user@example.com" })
		await table.put({ id: "u1", email: "user@example.com" })
		await table.patch({ id: "u1", email: "user@example.com" })

		expect(db.storage.executeTransaction).toHaveBeenNthCalledWith(1, [
			{
				type: "add",
				storeName: "users",
				value: {
					id: "generated-id",
					email: "USER@EXAMPLE.COM",
				},
				key: undefined,
			},
		])
		expect(db.storage.executeTransaction).toHaveBeenNthCalledWith(2, [
			{
				type: "put",
				storeName: "users",
				value: {
					id: "u1",
					email: "USER@EXAMPLE.COM",
				},
				key: undefined,
			},
		])
		expect(db.storage.executeTransaction).toHaveBeenNthCalledWith(3, [
			{
				type: "patch",
				storeName: "users",
				value: {
					id: "u1",
					email: "USER@EXAMPLE.COM",
				},
				key: undefined,
			},
		])
	})
})