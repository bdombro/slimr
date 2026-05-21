import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { DbSyncAuthError } from "../errors.js"
import { LocalAdapter } from "./LocalAdapter.js"
import { RestAdapter } from "./RestAdapter.js"

describe("adapters sendCode", () => {
	let fetchMock: ReturnType<typeof vi.fn>

	beforeEach(() => {
		fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	test("RestAdapter posts email to send-code endpoint", async () => {
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))
		const adapter = new RestAdapter({ url: "http://localhost:3000" })

		await expect(adapter.sendCode("user@example.com")).resolves.toBe(true)

		expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/session/send-code", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ email: "user@example.com" }),
		})
	})

	test("RestAdapter throws server message when send-code fails", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Invalid email" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestAdapter({ url: "http://localhost:3000" })

		await expect(adapter.sendCode("user@example.com")).rejects.toMatchObject({
			name: "DbSyncAuthError",
			code: "server",
			serverMessage: "Invalid email",
		} satisfies Partial<DbSyncAuthError>)
	})

	test("RestAdapter falls back when send-code error body is not JSON", async () => {
		fetchMock.mockResolvedValue(new Response("", { status: 400 }))
		const adapter = new RestAdapter({ url: "http://localhost:3000" })

		await expect(adapter.sendCode("user@example.com")).rejects.toMatchObject({
			code: "server",
			message: "Send code failed",
		})
	})

	test("RestAdapter throws server message when login fails", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Invalid code" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestAdapter({ url: "http://localhost:3000" })

		await expect(adapter.login("user@example.com", "000000")).rejects.toMatchObject({
			code: "server",
			message: "Invalid code",
		})
	})

	test("LocalAdapter always resolves true", async () => {
		const adapter = new LocalAdapter()
		await expect(adapter.sendCode("user@example.com")).resolves.toBe(true)
	})
})
