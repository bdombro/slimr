export type DbSyncErrorCode =
	| "not_authenticated"
	| "offline"
	| "pending_logout"
	| "server"
	| "unauthorized"
	| "forbidden"
	| "not_found"
	| "conflict"
	| "server_error"

export type ErrorSeverity = 0 | 1 | 2

function codeFromStatus(status: number): DbSyncErrorCode {
	if (status === 401) return "unauthorized"
	if (status === 403) return "forbidden"
	if (status === 404) return "not_found"
	if (status === 409) return "conflict"
	if (status >= 500 && status < 600) return "server_error"
	return "server"
}

function severityFromCode(code: DbSyncErrorCode): ErrorSeverity {
	if (code === "offline" || code === "server") return 0
	if (code === "server_error" || code === "not_found" || code === "conflict") return 1
	return 2
}

/** Thrown when `login()` or `revalidate()` is called while offline. */
export class DbSyncOfflineError extends Error {
	readonly code: DbSyncErrorCode = "offline"
	readonly severity: ErrorSeverity = 0

	constructor(message = "dbsync: network required") {
		super(message)
		this.name = "DbSyncOfflineError"
	}
}

/** Thrown when guarded APIs run without a logged-in session. */
export class DbSyncNotAuthenticatedError extends Error {
	readonly code: DbSyncErrorCode = "not_authenticated"
	readonly severity: ErrorSeverity = 2

	constructor(message = "dbsync: not logged in") {
		super(message)
		this.name = "DbSyncNotAuthenticatedError"
	}
}

/** Thrown for HTTP adapter failures (auth, pull, push, etc.). */
export class DbSyncHttpError extends Error {
	readonly code: DbSyncErrorCode
	readonly severity: ErrorSeverity
	readonly status?: number
	readonly serverCode?: string
	readonly serverMessage?: string

	constructor(
		code: "offline" | "pending_logout" | "server",
		message: string,
		options?: { status?: number; serverCode?: string; serverMessage?: string },
	) {
		super(message)
		this.name = "DbSyncHttpError"
		const resolvedCode =
			code === "server" && options?.status !== undefined ? codeFromStatus(options.status) : code
		this.code = resolvedCode
		this.severity = severityFromCode(resolvedCode)
		this.status = options?.status
		this.serverCode = options?.serverCode
		this.serverMessage = options?.serverMessage
	}
}
