export const AUTH_IS_LOGGED_IN_KEY = "dbsync-isLoggedIn"
export const AUTH_PENDING_LOGOUT_KEY = "dbsync-pendingLogout"
export const SYNC_LAST_SUCCESS_AT_KEY = "dbsync-lastSuccessAt"

/** Reads persisted login flag (defaults to false). */
export function readIsLoggedIn(): boolean {
	if (typeof localStorage === "undefined") return false
	return localStorage.getItem(AUTH_IS_LOGGED_IN_KEY) === "true"
}

/** Persists login flag for refresh hydration. */
export function writeIsLoggedIn(value: boolean) {
	if (typeof localStorage === "undefined") return
	if (value) localStorage.setItem(AUTH_IS_LOGGED_IN_KEY, "true")
	else localStorage.removeItem(AUTH_IS_LOGGED_IN_KEY)
}

/** Whether a remote logout is queued until the device is online. */
export function readPendingLogout(): boolean {
	if (typeof localStorage === "undefined") return false
	return localStorage.getItem(AUTH_PENDING_LOGOUT_KEY) === "true"
}

export function writePendingLogout(value: boolean) {
	if (typeof localStorage === "undefined") return
	if (value) localStorage.setItem(AUTH_PENDING_LOGOUT_KEY, "true")
	else localStorage.removeItem(AUTH_PENDING_LOGOUT_KEY)
}

/** Whether a full sync cycle has completed at least once (survives refresh until logout). */
export function readHasSyncedSuccessfully(): boolean {
	if (typeof localStorage === "undefined") return false
	return localStorage.getItem(SYNC_LAST_SUCCESS_AT_KEY) != null
}

/** Records the timestamp of the last successful sync cycle. */
export function writeLastSuccessAt(iso: string) {
	if (typeof localStorage === "undefined") return
	localStorage.setItem(SYNC_LAST_SUCCESS_AT_KEY, iso)
}

/** Reads the last successful sync timestamp, if any. */
export function readLastSuccessAt(): string | null {
	if (typeof localStorage === "undefined") return null
	return localStorage.getItem(SYNC_LAST_SUCCESS_AT_KEY)
}

/** Clears sync cursor keys after logout. */
export function clearSyncCursorKeys() {
	if (typeof localStorage === "undefined") return
	localStorage.removeItem(SYNC_LAST_SUCCESS_AT_KEY)
	localStorage.removeItem("dbsync-pullSyncedUpTo")
}
