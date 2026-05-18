import { expect, test } from "@playwright/test"

test.describe("DbSync cross-tab coordination", () => {
	test("broadcasts data updates across tabs", async ({ browser }) => {
		const context = await browser.newContext()
		const page1 = await context.newPage()
		const page2 = await context.newPage()

		await page1.goto("/")
		await page2.goto("/")

		await expect(page1.locator("#content")).toContainText("ready")
		await expect(page2.locator("#content")).toContainText("ready")

		await page1.evaluate(async () => {
			// @ts-ignore
			await window.postsRepo.put({ id: "1", title: "Cross-tab post" })
		})

		await expect(page2.locator("#content")).toContainText("updated:posts")
		await expect(page2.locator("#content")).toContainText("total:1")
	})

	test("elects a single polling leader via Web Locks", async ({ browser }) => {
		const context = await browser.newContext()

		const page1 = await context.newPage()
		await page1.goto("/")
		await expect(page1.locator("#content")).toContainText("ready")

		const page2 = await context.newPage()
		await page2.goto("/")
		await expect(page2.locator("#content")).toContainText("ready")

		// Have Tab 1 hold the lock artificially for long enough to verify exclusivity.
		await page1.evaluate(() => {
			// @ts-ignore
			window.db.syncEngine.performSync = () => new Promise((resolve) => setTimeout(resolve, 5000))
		})

		// Have Tab 2 log when it acquires the lock
		await page2.evaluate(() => {
			// @ts-ignore
			window.lockAcquiredTime = 0
			// @ts-ignore
			window.db.syncEngine.performSync = async () => {
				// @ts-ignore
				window.lockAcquiredTime = Date.now()
			}
		})

		// Trigger simultaneous syncs cleanly using Promise.all so playwright tracks them
		const p1 = page1.evaluate(() => {
			// @ts-ignore
			return window.db.triggerSync()
		})
		const p2 = page2.evaluate(() => {
			// @ts-ignore
			return window.db.triggerSync()
		})

		await expect
			.poll(async () => page2.evaluate(() => (window as any).lockAcquiredTime), {
				timeout: 1000,
			})
			.toBe(0)

		// Ensure test cleans up properly tracking floating promises
		await Promise.all([p1, p2])

		// Verify Tab 2 eventually got the lock once Tab 1 completed!
		const timeAfterLock = await page2.evaluate(() => (window as any).lockAcquiredTime)
		expect(timeAfterLock).toBeGreaterThan(0)
	})
})
