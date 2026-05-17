/**
 * The standard response shape returned by a backend pull request.
 */
export interface SyncPullResult {
	/** The records fetched from the remote backend. */
	items: any[]
	/** Whether more results remain to be fetched for the current cursor. */
	hasMore: boolean
}

/**
 * The contract implemented by all sync backends.
 */
export interface BackendAdapter {
	/** Checks whether the current session is authenticated. */
	checkAuth(): Promise<boolean>
	/** Logs the current user in against the backend. */
	login(email: string, code: string): Promise<boolean>
	/** Logs the current user out of the backend. */
	logout(): Promise<void>
	/** Pulls remote changes since the provided cursor. */
	pull(cursor: string): Promise<SyncPullResult>
	/** Pushes queued local mutations to the backend. */
	push(payload: any[]): Promise<void>
}
