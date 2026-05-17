import { defineConfig } from "@playwright/test"

/** Minimal Playwright configuration so the browser suite has a clear test directory. */
export default defineConfig({
	testDir: "./playwright",
	fullyParallel: true,
	use: {
		browserName: "chromium",
		baseURL: "http://127.0.0.1:5173",
	},
	webServer: {
		command: "cd playwright/fixtures && ../../../../node_modules/.bin/vite",
		port: 5173,
		host: "127.0.0.1",
		reuseExistingServer: !process.env.CI,
	},
})
