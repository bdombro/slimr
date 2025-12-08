/**
 * Extensions for String
 *
 * Note: Extending primitive's can be problematic without care. For more info, see
 * https://stackoverflow.com/questions/8859828/javascript-what-dangers-are-in-extending-array-prototype
 *
 * Tips:
 * 1. for...in will break if you naively extend via Set.propotype.foo = ...
 *    Instead, use Object.defineProperty({value: fnc, enumerable: false})
 * 2. Drop support for older Internet Explorer
 */

// You must export something or TS gets confused.
export {}

declare global {
	interface Set<T> {
		/** Return a deep clone */
		copy(): Set<T>
		/**
		 * Convert to a plain array
		 */
		toArray(): T
	}
}

Object.defineProperties(Set.prototype, {
	copy: {
		value: function () {
			return Object.copy(this)
		},
		enumerable: false,
	},
	toArray: {
		value: function () {
			return Array.from(this)
		},
		enumerable: false,
	},
})
