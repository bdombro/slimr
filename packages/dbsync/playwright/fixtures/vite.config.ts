import { defineConfig } from "vite"

/** Base config. Host and port are provided by Playwright via CLI. */
export default defineConfig({
	server: { host: "127.0.0.1", strictPort: true },
})
