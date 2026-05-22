import { describe, expect, test } from "vitest"
import { normalizePullCursor, pullCursorFromUpdatedAt } from "./syncCursor.js"

describe("syncCursor", () => {
	test("pullCursorFromUpdatedAt uses ms numbers", () => {
		expect(pullCursorFromUpdatedAt(1715904000000)).toBe("1715904000000")
	})

	test("pullCursorFromUpdatedAt migrates ISO strings to ms", () => {
		const iso = "2026-05-17T00:00:00.000Z"
		expect(pullCursorFromUpdatedAt(iso)).toBe(String(Date.parse(iso)))
	})

	test("normalizePullCursor migrates legacy ISO cursors", () => {
		const iso = "2026-05-17T00:00:00.000Z"
		expect(normalizePullCursor(iso)).toBe(String(Date.parse(iso)))
		expect(normalizePullCursor("1778976000000")).toBe("1778976000000")
	})
})
