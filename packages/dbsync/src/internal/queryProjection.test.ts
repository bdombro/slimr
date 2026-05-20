import { describe, expect, test } from "vitest"
import { hasProjection, projectRecord } from "./queryProjection.js"

describe("queryProjection", () => {
	test("hasProjection is false without select or omit", () => {
		expect(hasProjection({})).toBe(false)
	})

	test("projectRecord selects requested fields", () => {
		const projected = projectRecord(
			{ id: "1", title: "hello", tag: "red" },
			{ select: ["id", "title"] },
		)
		expect(projected).toEqual({ id: "1", title: "hello" })
	})

	test("projectRecord omits requested fields", () => {
		const projected = projectRecord({ id: "1", title: "hello", tag: "red" }, { omit: ["tag"] })
		expect(projected).toEqual({ id: "1", title: "hello" })
	})
})
