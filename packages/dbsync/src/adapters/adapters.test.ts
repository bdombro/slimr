import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { DbSyncHttpError } from "../errors.js"
import { LocalAdapter } from "./LocalAdapter.js"
import { RestBearerAdapter } from "./RestBearerAdapter.js"
import { RestCookieAdapter } from "./RestCookieAdapter.js"

describe("adapters sendCode", () => {
	let fetchMock: ReturnType<typeof vi.fn>

	beforeEach(() => {
		fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
		if (typeof localStorage !== "undefined") {
			localStorage.clear()
		}
	})

	test("RestCookieAdapter posts email to send-code endpoint", async () => {
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.sendCode("user@example.com")).resolves.toBe(true)

		expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/session/send-code", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ email: "user@example.com" }),
		})
	})

	test("RestCookieAdapter throws server message when send-code fails", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Invalid email" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.sendCode("user@example.com")).rejects.toMatchObject({
			name: "DbSyncHttpError",
			code: "server",
			severity: 0,
			serverMessage: "Invalid email",
			status: 400,
		} satisfies Partial<DbSyncHttpError>)
	})

	test("RestCookieAdapter falls back when send-code error body is not JSON", async () => {
		fetchMock.mockResolvedValue(new Response("", { status: 400 }))
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.sendCode("user@example.com")).rejects.toMatchObject({
			code: "server",
			severity: 0,
			message: "Send code failed",
			status: 400,
		})
	})

	test("RestCookieAdapter throws server message when login fails", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Invalid code", code: "INVALID_CODE" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.login("user@example.com", "000000")).rejects.toMatchObject({
			code: "unauthorized",
			severity: 2,
			message: "Invalid code",
			status: 401,
			serverCode: "INVALID_CODE",
		})
	})

	test("RestCookieAdapter throwIfNotOk includes status and serverCode from body", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Bad request", code: "BAD_REQ" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.sendCode("user@example.com")).rejects.toMatchObject({
			code: "server",
			severity: 0,
			message: "Bad request",
			status: 400,
			serverCode: "BAD_REQ",
		} satisfies Partial<DbSyncHttpError>)
	})

	test("RestCookieAdapter pull throws DbSyncHttpError with status on non-ok", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.pull("cursor")).rejects.toMatchObject({
			code: "unauthorized",
			severity: 2,
			message: "Unauthorized",
			status: 401,
		} satisfies Partial<DbSyncHttpError>)
	})

	test("RestCookieAdapter push throws DbSyncHttpError with status on non-ok", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Forbidden", code: "FORBIDDEN" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.push([])).rejects.toMatchObject({
			code: "forbidden",
			severity: 2,
			message: "Forbidden",
			status: 403,
			serverCode: "FORBIDDEN",
		} satisfies Partial<DbSyncHttpError>)
	})

	test("RestCookieAdapter pull throws with fallback message when body is not JSON", async () => {
		fetchMock.mockResolvedValue(new Response("", { status: 500 }))
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.pull("cursor")).rejects.toMatchObject({
			code: "server_error",
			severity: 1,
			message: "Pull failed",
			status: 500,
		})
	})

	test("RestCookieAdapter push throws with fallback message when body is not JSON", async () => {
		fetchMock.mockResolvedValue(new Response("", { status: 502 }))
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.push([])).rejects.toMatchObject({
			code: "server_error",
			severity: 1,
			message: "Push failed",
			status: 502,
		})
	})

	test("RestCookieAdapter 404 pull returns not_found with severity 1", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.pull("cursor")).rejects.toMatchObject({
			code: "not_found",
			severity: 1,
			status: 404,
		})
	})

	test("RestCookieAdapter 409 push returns conflict with severity 1", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: "Conflict" }), {
				status: 409,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestCookieAdapter({ url: "http://localhost:3000" })

		await expect(adapter.push([])).rejects.toMatchObject({
			code: "conflict",
			severity: 1,
			status: 409,
		})
	})

	test("RestBearerAdapter posts email to send-code endpoint", async () => {
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))
		const adapter = new RestBearerAdapter({ url: "http://localhost:3000" })

		await expect(adapter.sendCode("user@example.com")).resolves.toBe(true)

		expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/session/send-code", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "user@example.com" }),
		})
	})

	test("RestBearerAdapter login stores token in localStorage and returns userId", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ userId: "user-123", token: "my-bearer-token" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		)
		const adapter = new RestBearerAdapter({ url: "http://localhost:3000" })

		const result = await adapter.login("user@example.com", "123456")
		expect(result).toEqual({ userId: "user-123" })
		expect(localStorage.getItem("dbsync-token")).toBe("my-bearer-token")

		expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/session/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "user@example.com", code: "123456" }),
		})
	})

	test("RestBearerAdapter checkAuth calls /api/session with Authorization header", async () => {
		localStorage.setItem("dbsync-token", "my-bearer-token")
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))
		const adapter = new RestBearerAdapter({ url: "http://localhost:3000" })

		const authenticated = await adapter.checkAuth()
		expect(authenticated).toBe(true)
		expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/session", {
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer my-bearer-token",
			},
		})
	})

	test("RestBearerAdapter checkAuth returns false immediately if no token", async () => {
		const adapter = new RestBearerAdapter({ url: "http://localhost:3000" })
		const authenticated = await adapter.checkAuth()
		expect(authenticated).toBe(false)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	test("RestBearerAdapter logout clears token and calls /api/session/logout", async () => {
		localStorage.setItem("dbsync-token", "my-bearer-token")
		fetchMock.mockResolvedValue(new Response("", { status: 200 }))
		const adapter = new RestBearerAdapter({ url: "http://localhost:3000" })

		await adapter.logout()
		expect(localStorage.getItem("dbsync-token")).toBeNull()
		expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/session/logout", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer my-bearer-token",
			},
		})
	})

	test("RestBearerAdapter pull and push attach Authorization header", async () => {
		localStorage.setItem("dbsync-token", "my-bearer-token")
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 }),
		)
		const adapter = new RestBearerAdapter({ url: "http://localhost:3000" })

		await adapter.pull("cursor")
		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/api/posts?after=cursor&limit=40",
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer my-bearer-token",
				},
			},
		)

		fetchMock.mockResolvedValue(new Response("", { status: 200 }))
		await adapter.push([{ id: 1 }])
		expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/posts/upsert-many", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer my-bearer-token",
			},
			body: JSON.stringify([{ id: 1 }]),
		})
	})

	test("LocalAdapter always resolves true", async () => {
		const adapter = new LocalAdapter()
		await expect(adapter.sendCode("user@example.com")).resolves.toBe(true)
	})
})
