import type { BackendAdapter, SyncPullResult } from "./types.js"

export interface RestAdapterConfig {
	url: string
}

export class RestAdapter implements BackendAdapter {
	constructor(private config: RestAdapterConfig) {}

	public async checkAuth() {
		const res = await fetch(`${this.config.url}/api/session`, { credentials: "include" })
		return res.ok
	}

	public async login(email: string, code: string) {
		const res = await fetch(`${this.config.url}/api/session/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ email, code }),
		})
		if (!res.ok) throw new Error("Login failed")
		return true
	}

	public async logout() {
		await fetch(`${this.config.url}/api/session/logout`, { method: "POST", credentials: "include" })
	}

	public async pull(cursor: string): Promise<SyncPullResult> {
		const res = await fetch(`${this.config.url}/api/posts?after=${cursor}&limit=40`, {
			credentials: "include",
		})
		if (!res.ok) throw { status: res.status }
		return await res.json()
	}

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
