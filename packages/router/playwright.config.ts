import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "@playwright/test"
import { allocateLoopbackPort } from "./playwright/allocate-port.ts"

const packageRoot = dirname(fileURLToPath(import.meta.url))
const fixtureDir = resolve(packageRoot, "playwright/fixtures")
const viteBin = resolve(packageRoot, "../../node_modules/.bin/vite")

const fixtureBaseUrl =
	process.env.PW_FIXTURE_BASE_URL || `http://127.0.0.1:${await allocateLoopbackPort()}`
const fixturePort = new URL(fixtureBaseUrl).port

// Workers that call `browser.newContext()` must pass this as `baseURL` (not inherited from `use`).
process.env.PW_FIXTURE_BASE_URL = fixtureBaseUrl

/** Playwright config: ephemeral fixture Vite on IPv4 loopback. */
export default defineConfig({
	testDir: resolve(packageRoot, "playwright"),
	fullyParallel: true,
	projects: [
		{ name: "chromium", use: { browserName: "chromium", baseURL: fixtureBaseUrl } },
		{ name: "firefox", use: { browserName: "firefox", baseURL: fixtureBaseUrl } },
		{ name: "webkit", use: { browserName: "webkit", baseURL: fixtureBaseUrl } },
	],
	webServer: {
		command: `cd ${fixtureDir} && ${viteBin} --config vite.config.ts --host 127.0.0.1 --port ${fixturePort} --strictPort`,
		url: fixtureBaseUrl,
		reuseExistingServer: false,
		timeout: 60_000,
	},
})
