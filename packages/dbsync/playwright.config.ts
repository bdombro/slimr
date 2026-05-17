import { defineConfig } from "@playwright/test"

/** Minimal Playwright configuration so the browser suite has a clear test directory. */
export default defineConfig({
	testDir: "./playwright",
	fullyParallel: true,
	use: {
		browserName: "chromium",
	},
})
