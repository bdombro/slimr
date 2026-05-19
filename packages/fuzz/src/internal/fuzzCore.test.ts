import { describe, expect, it } from "vitest"
import {
	normalizeSearchableText,
	normalizeSearchQuery,
	parseExtract,
	scoreItem,
	scoreNumericBoost,
	scoreRecencyBoost,
} from "./fuzzCore.js"

const NOW = 1_700_000_000_000
const DAY = 24 * 60 * 60 * 1000

describe("fuzzCore normalization", () => {
	it("lowercases query and searchable text by default", () => {
		expect(normalizeSearchQuery("  Foo ")).toBe("foo")
		expect(normalizeSearchableText("  Bar ")).toBe("bar")
	})

	it("preserves case when caseSensitive is true", () => {
		expect(normalizeSearchQuery("  Foo ", true)).toBe("Foo")
		expect(normalizeSearchableText("  Bar ", true)).toBe("Bar")
	})

	it("parseExtract respects caseSensitive", () => {
		const insensitive = parseExtract([{ value: "Hello", weight: 1 }])
		const sensitive = parseExtract([{ value: "Hello", weight: 1 }], { caseSensitive: true })

		expect(insensitive.searchables[0].text).toBe("hello")
		expect(sensitive.searchables[0].text).toBe("Hello")
	})
})

describe("fuzzCore boosts", () => {
	it("recency boost is higher for newer timestamps", () => {
		const recent = scoreRecencyBoost(NOW - DAY, 1, { now: NOW })
		const old = scoreRecencyBoost(NOW - 30 * DAY, 1, { now: NOW })
		expect(recent).toBeGreaterThan(old)
	})

	it("numeric boost scales with value when numericMax is set", () => {
		const low = scoreNumericBoost(1, 1, { numericMax: 10 })
		const high = scoreNumericBoost(10, 1, { numericMax: 10 })
		expect(high).toBeGreaterThan(low)
	})

	it("scoreItem adds boosts only when text matches", () => {
		const searchables = [{ text: "todo", weight: 1 }]
		const boosts = {
			recency: [{ at: NOW, weight: 1 }],
			numeric: [{ value: 10, weight: 1 }],
		}

		expect(scoreItem(searchables, boosts, "todo", { now: NOW, numericMax: 10 })).toBeGreaterThan(
			100,
		)
		expect(scoreItem(searchables, boosts, "missing", { now: NOW, numericMax: 10 })).toBe(0)
	})

	it("recent item ranks above older item with the same text match", () => {
		const searchables = [{ text: "buy milk", weight: 1 }]
		const recent = scoreItem(
			searchables,
			{ recency: [{ at: NOW - DAY, weight: 1 }], numeric: [] },
			"buy",
			{ now: NOW },
		)
		const old = scoreItem(
			searchables,
			{ recency: [{ at: NOW - 60 * DAY, weight: 1 }], numeric: [] },
			"buy",
			{ now: NOW },
		)
		expect(recent).toBeGreaterThan(old)
	})
})
