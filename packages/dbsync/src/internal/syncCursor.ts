/**
 * Pull cursor helpers: sync uses Unix epoch milliseconds end-to-end (not ISO-8601).
 */

/** Converts a post `updatedAt` from the API into a pull cursor string (Unix ms). */
export function pullCursorFromUpdatedAt(updatedAt: unknown): string {
	if (typeof updatedAt === "number" && Number.isFinite(updatedAt)) {
		return String(Math.trunc(updatedAt))
	}
	if (typeof updatedAt === "string") {
		if (/^\d+(\.\d+)?$/.test(updatedAt)) return String(Math.trunc(Number(updatedAt)))
		const ms = Date.parse(updatedAt)
		if (!Number.isNaN(ms)) return String(ms)
	}
	return String(updatedAt ?? "")
}

/** Normalizes a stored pull cursor (migrates legacy ISO cursors to Unix ms). */
export function normalizePullCursor(cursor: string): string {
	if (!cursor) return ""
	return pullCursorFromUpdatedAt(cursor)
}
