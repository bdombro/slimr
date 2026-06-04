import { DbSyncHttpError } from "../errors.js"

/**
 * Throws `DbSyncHttpError` using the swift-crud `{ message }` body when present.
 *
 * @param res The response to check.
 * @param fallback The fallback message if the response body doesn't contain one.
 */
export async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
	if (res.ok) return
	let message = fallback
	let serverCode: string | undefined
	try {
		const body = await res.json()
		if (typeof body?.message === "string" && body.message.length > 0) {
			message = body.message
		}
		if (typeof body?.code === "string") {
			serverCode = body.code
		}
	} catch {
		// Non-JSON or empty body — use fallback.
	}
	throw new DbSyncHttpError("server", message, {
		status: res.status,
		serverCode,
		serverMessage: message,
	})
}
