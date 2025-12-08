import { customAlphabet } from "nanoid"

/**
 * Generate a random string of 12 characters, provided by [npm:nanoid](https://www.npmjs.com/package/nanoid).
 *
 * @returns {string} A random string of 12 characters.
 *
 * @example
 * ```typescript
 * const id = createUid()
 *```
 */
export const createUid = customAlphabet(
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	12,
)
