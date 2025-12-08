import { vi } from "vitest"

import { mapApplyMaxSize } from "./map-apply-max-size.js"

it("limits the size correctly", () => {
	// Tip: Need to vi.runAllTimers() before we do any Map.set, otherwise the
	// timeout in Map.get will run after we set the value and break the cache
	// strategy.
	vi.useFakeTimers()
	const t = mapApplyMaxSize(new Map(), 2)
	t.set("a", 1)
	t.set("b", 2)
	t.set("a", 3) // refreshes 'a'
	t.set("c", 4) // should evict 'b'
	expect(t.get("c")).toBe(4)
	expect(t.get("b")).toBeUndefined()
	vi.runAllTimers()
	t.set("d", 5) // should evict 'a'
	expect(t.get("d")).toBe(5)
	expect(t.get("a")).toBeUndefined()
	expect(t.get("c")).toBe(4) // accessing 'c' should refresh it's position
	vi.runAllTimers()
	t.set("e", 6) // should evict 'd'
	expect(t.get("d")).toBeUndefined()
})
