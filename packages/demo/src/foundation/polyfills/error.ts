/**
 * Polyfills for errors
 */

// You must export something or TS gets confused.
export {}

declare global {
	/**
	 * Shorthand for throwing errors
	 *
	 * @param message Error message
	 * @param attrs Additional attributes to add to the error
	 * @returns Never
	 */
	var throwError: typeof _throwError
}

globalThis.throwError = _throwError

function _throwError(messageOrError: string | Error, attrs?: sany): never {
	const error = typeof messageOrError === "string" ? new Error(messageOrError) : messageOrError
	throw Object.assign(error, attrs)
}
