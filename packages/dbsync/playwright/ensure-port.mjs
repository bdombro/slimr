import { writeFileSync } from "node:fs"
import { createServer } from "node:net"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const portFile = resolve(packageRoot, ".pw-fixture-port")

const getFreePort = () =>
	new Promise((resolvePort, reject) => {
		const server = createServer()
		server.once("error", reject)
		server.listen(0, "127.0.0.1", () => {
			const address = server.address()
			if (!address || typeof address === "string") {
				reject(new Error("Could not resolve a free port for Playwright fixtures"))
				return
			}
			const port = address.port
			server.close((error) => (error ? reject(error) : resolvePort(port)))
		})
	})

const port = process.env.PW_FIXTURE_PORT ? Number(process.env.PW_FIXTURE_PORT) : await getFreePort()

writeFileSync(portFile, String(port), "utf8")
