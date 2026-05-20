import { expect, test } from "@playwright/test"
import { mockSessionApi, type SessionApiStats } from "./session-api.js"
import { getFixtureBaseUrl } from "./test-base-url.js"

const authPath = "/auth.html"

test.describe("DbSync offline auth", () => {
	test("hydrates isLoggedIn on refresh and runs onLogin without onLogout", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		const stats: SessionApiStats = { logoutCalls: 0, loginCalls: 0, checkAuthCalls: 0 }
		await mockSessionApi(page, stats)

		await page.goto(authPath)
		await page.evaluate(() => window.seedLoggedIn())
		await page.reload()

		await expect(page.locator("#content")).toContainText("boot:true")
		await expect(page.locator("#content")).toContainText("onLogin:1")
		await expect(page.locator("#content")).not.toContainText("onLogout")

		const state = await page.evaluate(() => window.getState())
		expect(state.isLoggedIn).toBe(true)
		expect(state.initted).toBe(true)
	})

	test("offline logout clears local data and defers remote logout", async ({ browser }) => {
		const context = await browser.newContext({ baseURL: getFixtureBaseUrl() })
		const page = await context.newPage()
		const stats: SessionApiStats = { logoutCalls: 0, loginCalls: 0, checkAuthCalls: 0 }
		await mockSessionApi(page, stats)

		await page.goto(authPath)
		await page.evaluate(() => window.seedLoggedIn())
		await page.reload()
		await expect(page.locator("#content")).toContainText("onLogin:1")

		await context.setOffline(true)

		await page.evaluate(async () => {
			await window.postsRepo.put({ id: "1", title: "offline wipe" })
		})
		await page.evaluate(async () => {
			await window.db.logout()
		})

		await expect(page.locator("#content")).toContainText("onLogout:1")

		const afterLogout = await page.evaluate(() => window.getState())
		expect(afterLogout.isLoggedIn).toBe(false)
		expect(afterLogout.pendingLogout).toBe(true)
		expect(stats.logoutCalls).toBe(0)

		await expect
			.poll(() =>
				page.evaluate(async () => {
					try {
						await window.db.get("posts", "1")
						return "found"
					} catch {
						return "cleared"
					}
				}),
			)
			.toBe("cleared")

		await context.setOffline(false)
		await expect.poll(() => stats.logoutCalls).toBe(1)
		await expect.poll(() => page.evaluate(() => window.getState().pendingLogout)).toBe(false)
	})

	test("login throws when offline", async ({ browser }) => {
		const context = await browser.newContext({ baseURL: getFixtureBaseUrl() })
		const page = await context.newPage()
		const stats: SessionApiStats = { logoutCalls: 0, loginCalls: 0, checkAuthCalls: 0 }
		await mockSessionApi(page, stats)

		await page.goto(authPath)
		await context.setOffline(true)
		const error = await page.evaluate(async () => {
			try {
				await window.db.login("user@example.com", "123456")
				return null
			} catch (err: any) {
				return err?.name ?? String(err)
			}
		})

		expect(error).toBe("DbSyncOfflineError")
		expect(stats.loginCalls).toBe(0)
	})
})
