export const AUTH_IS_LOGGED_IN_KEY = "dbsync-isLoggedIn"
export const AUTH_PENDING_LOGOUT_KEY = "dbsync-pendingLogout"
export const SYNC_LAST_SUCCESS_AT_KEY = "dbsync-lastSuccessAt"
export const AUTH_EMAIL_KEY = "dbsync-email"
export const AUTH_USER_ID_KEY = "dbsync-userId"

/** Reads persisted email address (defaults to null). */
export function readEmail(): string | null {
	if (typeof localStorage === "undefined") return null
	return localStorage.getItem(AUTH_EMAIL_KEY)
}

/** Persists email address or clears it on logout. */
export function writeEmail(value: string | null) {
	if (typeof localStorage === "undefined") return
	if (value) localStorage.setItem(AUTH_EMAIL_KEY, value)
	else localStorage.removeItem(AUTH_EMAIL_KEY)
}

/** Reads persisted user ID (defaults to null). */
export function readUserId(): string | null {
	if (typeof localStorage === "undefined") return null
	return localStorage.getItem(AUTH_USER_ID_KEY)
}

/** Persists user ID or clears it on logout. */
export function writeUserId(value: string | null) {
	if (typeof localStorage === "undefined") return
	if (value) localStorage.setItem(AUTH_USER_ID_KEY, value)
	else localStorage.removeItem(AUTH_USER_ID_KEY)
}

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
