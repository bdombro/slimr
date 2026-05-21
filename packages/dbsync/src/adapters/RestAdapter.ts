import type { BackendAdapter, SyncPullResult } from "./types.js"

/**
 * Throws an `Error` using the swift-crud `{ message }` body when present.
 */
async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
	if (res.ok) return
	let message = fallback
	let code = 0
	try {
		const body = await res.json()
		if (typeof body?.message === "string" && body.message.length > 0) {
			message = body.message
		}
		if (typeof body?.code === "number" && body.code > 0) {
			code = body.code
		}
	} catch {
		// Non-JSON or empty body — use fallback.
	}
	throw Object.assign(new Error(message), { code })
}

/**
 * Configuration for the built-in REST adapter.
 */
export interface RestAdapterConfig {
	/** The base URL of the remote API. */
	url: string
}

/**
 * A REST-backed implementation of the backend adapter contract.
 */
export class RestAdapter implements BackendAdapter {
	/** REST apps require login before data APIs and sync. */
	public readonly requiresAuth = true as const

	/**
	 * Stores the adapter configuration, including the API base URL.
	 *
	 * @param config The REST adapter configuration.
	 */
	constructor(private config: RestAdapterConfig) {}

	/** Checks whether the server session cookie is currently authenticated. */
	public async checkAuth() {
		const res = await fetch(`${this.config.url}/api/session`, { credentials: "include" })
		return res.ok
	}

	/** Sends a one-time login code to the given email address. */
	public async sendCode(email: string) {
		const res = await fetch(`${this.config.url}/api/session/send-code`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ email }),
		})
		await throwIfNotOk(res, "Send code failed")
		return true
	}

	/** Logs the user in using an email/code pair. */
	public async login(email: string, code: string) {
		const res = await fetch(`${this.config.url}/api/session/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ email, code }),
		})
		await throwIfNotOk(res, "Login failed")
		return true
	}

	/** Logs the current user out of the remote session. */
	public async logout() {
		await fetch(`${this.config.url}/api/session/logout`, { method: "POST", credentials: "include" })
	}

	/** Pulls remote records from the REST backend using the provided cursor. */
	public async pull(cursor: string): Promise<SyncPullResult> {
		const res = await fetch(`${this.config.url}/api/posts?after=${cursor}&limit=40`, {
			credentials: "include",
		})
		if (!res.ok) throw { status: res.status }
		return await res.json()
	}

	/** Pushes queued local mutations to the REST backend. */
	public async push(payload: any[]): Promise<void> {
		const res = await fetch(`${this.config.url}/api/posts/upsert-many`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(payload),
		})
		if (!res.ok) throw { status: res.status }
	}
}
