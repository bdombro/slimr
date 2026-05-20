import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "@playwright/test"

const packageRoot = dirname(fileURLToPath(import.meta.url))
const fixtureDir = resolve(packageRoot, "playwright/fixtures")
const viteBin = resolve(packageRoot, "../../node_modules/.bin/vite")
const portFile = resolve(packageRoot, ".pw-fixture-port")

/** Obscure fallback when `ensure-port.mjs` was not run (e.g. `playwright test` invoked directly). */
const DEFAULT_FIXTURE_PORT = 41_783

const readFixturePort = () => {
	if (process.env.PW_FIXTURE_PORT) {
		return Number(process.env.PW_FIXTURE_PORT)
	}
	if (existsSync(portFile)) {
		return Number(readFileSync(portFile, "utf8"))
	}
	return DEFAULT_FIXTURE_PORT
}

const port = readFixturePort()
const baseURL = `http://127.0.0.1:${port}`

/** Playwright config: fixture Vite on 127.0.0.1 with a dedicated port for this run. */
export default defineConfig({
	testDir: resolve(packageRoot, "playwright"),
	fullyParallel: true,
	use: {
		browserName: "chromium",
		baseURL,
	},
	webServer: {
		command: `cd ${fixtureDir} && ${viteBin} --config vite.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
	},
})
