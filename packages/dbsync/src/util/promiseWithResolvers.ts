/**
 * Creates a promise together with its external resolve and reject handlers.
 *
 * This mirrors `Promise.withResolvers()` in environments that do not provide
 * the built-in helper yet.
 */
export function promiseWithResolvers<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void
	let reject!: (reason?: any) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}
