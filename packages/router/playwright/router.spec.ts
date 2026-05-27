import { expect, test } from "@playwright/test"
import { getFixtureBaseUrl } from "./test-base-url.js"

test.describe("Router E2E", () => {
	test("initial page shows home route", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")
		await expect(page.locator("#content")).toContainText("home")
	})

	test("goto navigates to a route", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		await page.evaluate(() => (window as any).router.goto("about"))
		await expect(page.locator("#content")).toContainText("about")
	})

	test("anchor click navigates via router", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		await page.click("#link-about")
		await expect(page.locator("#content")).toContainText("about")
	})

	test("browser back restores previous route", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		await page.evaluate(() => (window as any).router.goto("/about"))
		await expect(page.locator("#content")).toContainText("about")

		await page.goBack()
		await expect(page.locator("#content")).toContainText("home")
	})

	test("browser forward restores previous route", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		await page.evaluate(() => (window as any).router.goto("/about"))
		await page.goBack()
		await expect(page.locator("#content")).toContainText("home")
		await page.goForward()
		await expect(page.locator("#content")).toContainText("about")
	})

	test("mailto link bypasses router", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		const key = await page.evaluate(() => {
			;(window as any).router.subscribe(() => {})
			return (window as any).router.current.route.key
		})
		expect(key).toBe("home")
	})

	test("external target=_blank link bypasses router", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		await page.click("#link-external-blank")
		const key = await page.evaluate(() => (window as any).router.current.route.key)
		expect(key).toBe("home")
	})

	test("#replace doesn't add a new history entry", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		const beforeLen = await page.evaluate(() => history.length)

		await page.evaluate(() => (window as any).router.goto("/about#replace"))
		await expect(page.locator("#content")).toContainText("about")

		const afterLen = await page.evaluate(() => history.length)
		// #replace should not add a new entry, so length should stay the same
		expect(afterLen).toBe(beforeLen)
	})

	test("stack routing", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		await page.evaluate(() => (window as any).router.goto("/photos/1"))
		await expect(page.locator("#content")).toContainText("detail")

		await page.goBack()
		await expect(page.locator("#content")).toContainText("home")
	})

	test("subscribe receives route change", async ({ browser }) => {
		const page = await browser.newPage({ baseURL: getFixtureBaseUrl() })
		await page.goto("/")

		const calls = await page.evaluate(() => {
			let count = 0
			;(window as any).router.subscribe(() => {
				count++
			})
			;(window as any).router.goto("about")
			return count
		})

		expect(calls).toBe(1)
	})
})
