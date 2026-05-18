/** Minimal error helper used by repo scripts to throw consistent failures. */
export function throwError(e: Error | string): never {
	throw e
}
