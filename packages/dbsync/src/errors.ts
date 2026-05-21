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

/** Thrown for auth adapter failures and blocked login attempts. */
export class DbSyncAuthError extends Error {
	readonly code: "offline" | "pending_logout" | "server"
	readonly serverMessage?: string

	constructor(
		code: DbSyncAuthError["code"],
		message: string,
		options?: { serverMessage?: string },
	) {
		super(message)
		this.name = "DbSyncAuthError"
		this.code = code
		this.serverMessage = options?.serverMessage
	}
}
