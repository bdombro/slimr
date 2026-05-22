import { expect, test } from "@playwright/test"
import { getFixtureBaseUrl } from "./test-base-url.js"

test.describe("DbSync cross-tab coordination", () => {
	test("broadcasts data updates across tabs", async ({ browser }) => {
		const context = await browser.newContext({ baseURL: getFixtureBaseUrl() })
		const page1 = await context.newPage()
		const page2 = await context.newPage()

		await page1.goto("/")
		await page2.goto("/")

		await expect(page1.locator("#content")).toContainText("ready")
		await expect(page2.locator("#content")).toContainText("ready")

		await page1.evaluate(async () => {
			await window.postsRepo.put({ id: "1", title: "Cross-tab post" })
		})

		await expect(page2.locator("#content")).toContainText("updated:posts")
		await expect(page2.locator("#content")).toContainText("total:1")
	})

	test("elects a single polling leader via Web Locks", async ({ browser }) => {
		const context = await browser.newContext({ baseURL: getFixtureBaseUrl() })

		const page1 = await context.newPage()
		await page1.goto("/")
		await expect(page1.locator("#content")).toContainText("ready")

		const page2 = await context.newPage()
		await page2.goto("/")
		await expect(page2.locator("#content")).toContainText("ready")

		await page1.evaluate(() => {
			window.db.sync.setPerformSyncHook(() => new Promise((resolve) => setTimeout(resolve, 5000)))
		})

		await page2.evaluate(() => {
			window.lockAcquiredTime = 0
			window.db.sync.setPerformSyncHook(async () => {
				window.lockAcquiredTime = Date.now()
			})
		})

		const p1 = page1.evaluate(() => window.db.sync.trigger())
		const p2 = page2.evaluate(() => window.db.sync.trigger())

		await expect
			.poll(async () => page2.evaluate(() => window.lockAcquiredTime), {
				timeout: 1000,
			})
			.toBe(0)

		await Promise.all([p1, p2])

		const timeAfterLock = await page2.evaluate(() => window.lockAcquiredTime)
		expect(timeAfterLock).toBeGreaterThan(0)
	})
})
