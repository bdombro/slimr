/**
 * Debounce a function
 *
 * Don't call a function until a certain amount of time has passed
 * without it being called.
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
