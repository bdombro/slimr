import { expect, test } from "@playwright/test"
import { mockSessionApi, type SessionApiStats } from "./session-api.js"
import { getFixtureBaseUrl } from "./test-base-url.js"

const authPath = "/auth.html"

test.describe("DbSync cross-tab auth", () => {
	test("broadcasts AUTH_LOGOUT to passive tab", async ({ browser }) => {
		const stats: SessionApiStats = { logoutCalls: 0, loginCalls: 0, checkAuthCalls: 0 }
		const context = await browser.newContext({ baseURL: getFixtureBaseUrl() })
		const page1 = await context.newPage()
		const page2 = await context.newPage()
		await mockSessionApi(page1, stats)
		await mockSessionApi(page2, stats)

		await page1.goto(authPath)
		await page2.goto(authPath)

		await page1.evaluate(async () => {
			await window.db.auth.login("user@example.com", "123456")
		})
		await expect(page1.locator("#content")).toContainText("onAuthenticated:1")
		await expect(page2.locator("#content")).toContainText("onAuthenticated:1")

		await page1.evaluate(async () => {
			await window.db.auth.logout()
		})

		await expect(page1.locator("#content")).toContainText("onLogout:1")
		await expect(page2.locator("#content")).toContainText("onLogout:1")

		const tab2 = await page2.evaluate(() => window.getState())
		expect(tab2.isLoggedIn).toBe(false)
		// Only the originating tab performs remote logout.
		expect(stats.logoutCalls).toBe(1)
	})

	test("broadcasts AUTH_LOGIN to passive tab after login", async ({ browser }) => {
		const stats: SessionApiStats = { logoutCalls: 0, loginCalls: 0, checkAuthCalls: 0 }
		const context = await browser.newContext({ baseURL: getFixtureBaseUrl() })
		const page1 = await context.newPage()
		const page2 = await context.newPage()
		await mockSessionApi(page1, stats)
		await mockSessionApi(page2, stats)

		await page1.goto(authPath)
		await page2.goto(authPath)

		await expect(page1.locator("#content")).toContainText("boot:false")
		await expect(page2.locator("#content")).not.toContainText("onAuthenticated")

		await page1.evaluate(async () => {
			await window.db.auth.login("user@example.com", "123456")
		})

		await expect(page1.locator("#content")).toContainText("onAuthenticated:1")
		await expect(page2.locator("#content")).toContainText("onAuthenticated:1")

		const tab2 = await page2.evaluate(() => window.getState())
		expect(tab2.isLoggedIn).toBe(true)
		expect(tab2.isReady).toBe(true)
	})
})
