import type { Page } from "@playwright/test"

/** Tracks mock session API calls for assertions. */
export type SessionApiStats = {
	logoutCalls: number
	loginCalls: number
	checkAuthCalls: number
}

/** Mocks RestAdapter session and sync endpoints for auth e2e tests. */
export async function mockSessionApi(page: Page, stats: SessionApiStats) {
	await page.route("**/api/session/logout", async (route) => {
		stats.logoutCalls += 1
		await route.fulfill({ status: 200, body: "" })
	})
	await page.route("**/api/session/login", async (route) => {
		stats.loginCalls += 1
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ userId: "mock-uuid" }),
		})
	})
	await page.route("**/api/session", async (route) => {
		if (route.request().method() !== "GET") {
			await route.continue()
			return
		}
		stats.checkAuthCalls += 1
		await route.fulfill({ status: 200, body: "" })
	})
	await page.route("**/api/posts**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ items: [], hasMore: false }),
		})
	})
}
