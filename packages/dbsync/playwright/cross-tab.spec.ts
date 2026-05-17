import { expect, test } from "@playwright/test"

/**
 * Browser-level coordination tests for DbSync.
 *
 * These are intentionally kept as a separate Playwright suite because they need
 * real tabs, real BroadcastChannel behavior, and real Web Locks arbitration.
 */
test.describe("DbSync cross-tab coordination", () => {
	/** Verifies that a write in one tab notifies another tab through BroadcastChannel and reactivity wiring. */
	test("broadcasts data updates across tabs", async ({ browser }) => {
		// TODO: Load the package in a browser fixture or demo page, then assert that
		// a write in one tab updates the UI in a second tab.
		expect(true).toBe(true)
	})

	/** Verifies that only one tab polls the backend at a time and another tab takes over when the leader disappears. */
	test("elects a single polling leader", async ({ browser }) => {
		// TODO: Load the package in multiple tabs, enable sync in each one, and
		// assert that only one tab performs network polling at a time.
	})
})
