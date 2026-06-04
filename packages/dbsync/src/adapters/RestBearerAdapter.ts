import { throwIfNotOk } from "./throwIfNotOk.js"
import type { BackendAdapter, SyncPullResult } from "./types.js"

/**
 * Configuration for the REST bearer token adapter.
 */
export interface RestBearerAdapterConfig {
	/** The base URL of the remote API. */
	url: string
	/** The localStorage key used to persist the token. Defaults to "dbsync-token". */
	tokenKey?: string
}

/**
 * A REST-backed implementation of the backend adapter contract using Bearer tokens.
 */
export class RestBearerAdapter implements BackendAdapter {
	/** REST apps require login before data APIs and sync. */
	public readonly requiresAuth = true as const
	private readonly tokenKey: string

	/**
	 * Stores the adapter configuration.
	 *
	 * @param config The REST bearer adapter configuration.
	 */
	constructor(private config: RestBearerAdapterConfig) {
		this.tokenKey = config.tokenKey ?? "dbsync-token"
	}

	private get token(): string | null {
		if (typeof localStorage === "undefined") return null
		return localStorage.getItem(this.tokenKey)
	}

	private set token(value: string | null) {
		if (typeof localStorage === "undefined") return
		if (value) {
			localStorage.setItem(this.tokenKey, value)
		} else {
			localStorage.removeItem(this.tokenKey)
		}
	}

	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		}
		const t = this.token
		if (t) {
			headers.Authorization = `Bearer ${t}`
		}
		return headers
	}

	/** Checks whether the local token is valid. */
	public async checkAuth() {
		if (!this.token) return false
		const res = await fetch(`${this.config.url}/api/session`, {
			headers: this.getHeaders(),
		})
		return res.ok
	}

	/** Sends a one-time login code to the given email address. */
	public async sendCode(email: string) {
		const res = await fetch(`${this.config.url}/api/session/send-code`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		})
		await throwIfNotOk(res, "Send code failed")
		return true
	}

	/** Logs the user in using an email/code pair, storing the returned token. */
	public async login(email: string, code: string) {
		const res = await fetch(`${this.config.url}/api/session/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, code }),
		})
		await throwIfNotOk(res, "Login failed")
		const data = await res.json()
		if (!data.token) {
			throw new Error("Login succeeded but server returned no token")
		}
		this.token = data.token
		return { userId: data.userId || "" }
	}

	/** Logs the current user out, clearing the local token. */
	public async logout() {
		try {
			await fetch(`${this.config.url}/api/session/logout`, {
				method: "POST",
				headers: this.getHeaders(),
			})
		} catch {
			// ignore network errors on logout
		} finally {
			this.token = null
		}
	}

	/** Pulls remote records from the REST backend using the provided cursor. */
	public async pull(cursor: string): Promise<SyncPullResult> {
		const res = await fetch(`${this.config.url}/api/posts?after=${cursor}&limit=40`, {
			headers: this.getHeaders(),
		})
		await throwIfNotOk(res, "Pull failed")
		return await res.json()
	}

	/** Pushes queued local mutations to the REST backend. */
	public async push(payload: any[]): Promise<void> {
		const res = await fetch(`${this.config.url}/api/posts/upsert-many`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(payload),
		})
		await throwIfNotOk(res, "Push failed")
	}
}
