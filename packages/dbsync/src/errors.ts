/** Thrown when `login()` or `revalidate()` is called while offline. */
export class DbSyncOfflineError extends Error {
	constructor(message = "dbsync: network required") {
		super(message)
		this.name = "DbSyncOfflineError"
	}
}

/** Thrown when guarded APIs run without a logged-in session. */
export class DbSyncNotAuthenticatedError extends Error {
	constructor(message = "dbsync: not logged in") {
		super(message)
		this.name = "DbSyncNotAuthenticatedError"
	}
}

/** Thrown for HTTP adapter failures (auth, pull, push, etc.). */
export class DbSyncHttpError extends Error {
	readonly code: "offline" | "pending_logout" | "server"
	readonly status?: number
	readonly serverCode?: string
	readonly serverMessage?: string

	constructor(
		code: DbSyncHttpError["code"],
		message: string,
		options?: { status?: number; serverCode?: string; serverMessage?: string },
	) {
		super(message)
		this.name = "DbSyncHttpError"
		this.code = code
		this.status = options?.status
		this.serverCode = options?.serverCode
		this.serverMessage = options?.serverMessage
	}
}
