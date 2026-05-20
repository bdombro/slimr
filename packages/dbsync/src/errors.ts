/** Thrown when `login()` or `revalidateSession()` is called while offline. */
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
