import { defineConfig } from "@playwright/test"

/** Minimal Playwright configuration so the browser suite has a clear test directory. */
export default defineConfig({
	testDir: "./playwright",
	fullyParallel: true,
	use: {
		browserName: "chromium",
		baseURL: "http://localhost:5173",
	},
	webServer: {
		command: "cd ../../ && ./node_modules/.bin/vite packages/dbsync/playwright/fixtures",
		port: 5173,
		reuseExistingServer: !process.env.CI,
	},
})
