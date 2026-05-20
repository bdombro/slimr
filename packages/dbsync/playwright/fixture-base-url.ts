import { test } from "@playwright/test"

const port = process.env.PW_FIXTURE_PORT
if (!port) {
	throw new Error(
		"PW_FIXTURE_PORT is unset; fixture Vite did not report a port (check webServer.wait / stdout)",
	)
}

test.use({ baseURL: `http://127.0.0.1:${port}` })
