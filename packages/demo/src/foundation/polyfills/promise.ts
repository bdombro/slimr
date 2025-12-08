/**
 * Polyfills for Promise
 */

// You must export something or TS gets confused.
export {}

declare global {
	var sleep: (ms: number) => Promise<undefined>

	interface PromiseConstructor {
		/**
		 * Return a promise that resolves after ms milliseconds
		 *
		 * Is basically the same as Rambdax's delay
		 *
		 * Can be used in async functions to wait for stuff.
		 *
		 * For example,
		 * while(checkIfTrue()) await sleep(200);
		 *
		 * @param ms: Number of milliseconds to wait
		 *
		 **/
		sleep(ms: number): Promise<undefined>
		/**
		 * Wraps a function in async so that it always returns a promise
		 */
		promisify<T extends Fnc>(fn: T): (...props: Parameters<T>) => Promise<ReturnTypeP<T>>
	}
	// interface Promise<T> {
	// 	foo: 'bar'
	// }
}

globalThis.sleep = Promise.sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms))

Promise.promisify =
	(fn) =>
	async (...p) =>
		fn(...p)
