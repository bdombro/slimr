import { defineConfig } from "@playwright/test"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const packageRoot = dirname(fileURLToPath(import.meta.url))
const fixtureDir = resolve(packageRoot, "playwright/fixtures")
const viteBin = resolve(packageRoot, "../../node_modules/.bin/vite")

/** Minimal Playwright configuration so the browser suite has a clear test directory. */
export default defineConfig({
	testDir: resolve(packageRoot, "playwright"),
	fullyParallel: true,
	use: {
		browserName: "chromium",
		baseURL: "http://127.0.0.1:5173",
	},
	webServer: {
		command: `cd ${fixtureDir} && ${viteBin} --host 127.0.0.1`,
		port: 5173,
		host: "127.0.0.1",
		reuseExistingServer: !process.env.CI,
	},
})
