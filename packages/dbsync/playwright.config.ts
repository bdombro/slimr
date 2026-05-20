import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "@playwright/test"

const packageRoot = dirname(fileURLToPath(import.meta.url))
const fixtureDir = resolve(packageRoot, "playwright/fixtures")
const viteBin = resolve(packageRoot, "../../node_modules/.bin/vite")

/** Vite prints `Local: http://127.0.0.1:<port>/` when ready; capture group → `PW_FIXTURE_PORT`. */
const viteReady = /Local:\s+http:\/\/127\.0\.0\.1:(?<pw_fixture_port>\d+)/

/** Playwright config: ephemeral fixture Vite on IPv4 loopback (port from `webServer.wait`). */
export default defineConfig({
	testDir: resolve(packageRoot, "playwright"),
	fullyParallel: true,
	use: {
		browserName: "chromium",
	},
	webServer: {
		command: `cd ${fixtureDir} && ${viteBin} --config vite.config.ts --host 127.0.0.1 --port 0 --strictPort`,
		stdout: "pipe",
		wait: { stdout: viteReady },
		reuseExistingServer: !process.env.CI,
	},
})
