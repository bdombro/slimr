/**
 * Creates a promise together with its external resolve and reject handlers.
 *
 * This mirrors `Promise.withResolvers()` in environments that do not provide
 * the built-in helper yet.
 */
export function promiseWithResolvers<T>() {
	/** Resolves the created promise. */
	let resolve!: (value: T | PromiseLike<T>) => void
	/** Rejects the created promise. */
	let reject!: (reason?: any) => void
	/** The promise instance returned to the caller. */
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

/** Resolves after the requested delay. */
export function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
