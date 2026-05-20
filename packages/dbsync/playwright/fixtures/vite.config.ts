import { defineConfig } from "vite"

/** Port is set by Playwright via CLI (`--port`); host is fixed to IPv4 loopback. */
export default defineConfig({
	server: { host: "127.0.0.1", strictPort: true },
})
