import { createServer } from "node:net"

/** Reserves a free TCP port on 127.0.0.1 for the fixture Vite server. */
export function allocateLoopbackPort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer()
		server.unref()
		server.on("error", reject)
		server.listen(0, "127.0.0.1", () => {
			const address = server.address()
			if (!address || typeof address === "string") {
				reject(new Error("failed to allocate loopback port"))
				return
			}
			const port = address.port
			server.close((err) => (err ? reject(err) : resolve(port)))
		})
	})
}
