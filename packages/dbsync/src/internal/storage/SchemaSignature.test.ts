import { describe, expect, test } from "vitest"
import { getSchemaSignature } from "./SchemaSignature.js"

/** Verifies the signature helper stays stable regardless of table or index input order. */
describe("getSchemaSignature", () => {
	test("sorts table names and indexes before serializing", () => {
		expect(
			getSchemaSignature(
				[
					{ storeName: "posts", indexes: ["createdAt", "name"] },
					{ storeName: "users", indexes: ["email"] },
				],
				"storeName",
			),
		).toBe(
			JSON.stringify([
				{ table: "posts", indexes: ["createdAt", "name"] },
				{ table: "users", indexes: ["email"] },
			]),
		)

		expect(
			getSchemaSignature(
				[
					{ tableName: "users", indexes: ["email"] },
					{ tableName: "posts", indexes: ["name", "createdAt"] },
				],
				"tableName",
			),
		).toBe(
			JSON.stringify([
				{ table: "posts", indexes: ["createdAt", "name"] },
				{ table: "users", indexes: ["email"] },
			]),
		)
	})
})
