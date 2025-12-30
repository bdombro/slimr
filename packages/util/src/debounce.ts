/**
 * Debounce a function
 *
 * Don't call a function until a certain amount of time has passed
 * without it being called.
 *
 * In other words, we intentionally delay invoking `fnc` until after
 * `delay` milliseconds have elapsed since the last time the debounced.
 * If it gets called again, we cancel the previous call and start a new timer.
 *
 * If you want more features, like arg diffing and return values, see
 * @slimr/util/memoize
 */
export function debounce<T extends (...args: any) => any>(
	fnc: T,
	delay = 250,
): (...args: Parameters<T>) => void {
	let timeout: any
	return (...args: Parameters<T>) => {
		return new Promise((resolve) => {
			if (timeout) {
				clearTimeout(timeout)
			}
			timeout = setTimeout(() => {
				resolve(fnc(...(args as any)))
			}, delay)
		})
	}
}
