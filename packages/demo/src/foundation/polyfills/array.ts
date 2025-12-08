/**
 * Polyfills for Array
 *
 * Note: Extending primitive's can be problematic without care. For more info, see
 * https://stackoverflow.com/questions/8859828/javascript-what-dangers-are-in-extending-array-prototype
 *
 * Tips:
 * 1. for...in will break if you naively extend via Array.propotype.foo = ...
 *    Instead, use Object.defineProperty({value: fnc, enumerable: false})
 * 2. Drop support for older Internet Explorer
 */

// You must export something or TS gets confused.
export {}

declare global {
	interface ArrayConstructor {
		/**
		 * Will return an array containing what's in the first array but NOT in the other arrays.
		 * adapted from https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_difference
		 */
		difference: ArrayDifferenceType
		/**
		 * Return an intersection array of two or multiple arrays
		 *
		 * Example: arrayIntersection([1,2], [1]) => [1]
		 */
		intersection: ArrayDifferenceType
		/**
		 * Alias for Array(n).fill(undefined).map(fn)
		 */
		mapN<T>(n: number, fn: () => T): T[]
		/**
		 * Alias for Array(n).fill(undefined).reduce(fn, initial)
		 */
		reduceN<T>(n: number, fn: (acc: T) => T, initial: T): T[]
	}
	interface Array<T> {
		/**
		 * Returns a copy of the array
		 */
		copy(): T[]
		/**
		 * Remove values that are repeated
		 */
		deDup(): T[]
		/**
		 * Checks if the array contains the any value multiple times
		 */
		duplicateCheck(): boolean
		/**
		 * Aka !arr.includes(val)
		 */
		excludes(val: sany): boolean
		/**
		 * Returns a Record keyed by a property of the elements in the array
		 */
		keyBy(key: string | number | symbol): Record<string, T[]>
		/**
		 * Subtracts the values of an array(s) from the current array
		 */
		minus(...otherArrs: string[][]): undefined
		/**
		 * Functional version of subtract that returns a new array
		 */
		minusF(...otherArrs: string[][]): T[]
		/**
		 * Functional version of pop
		 */
		popF(): T
		/**
		 * Pop the last N elements from the array
		 */
		popN(n: number): T[]
		/**
		 * Functional version of popN
		 */
		popNF(n: number): T[]
		/**
		 * Functional version of push
		 */
		pushF(...values: T[]): number
		/**
		 * Functional version of shift
		 */
		shiftF(): T
		/**
		 * Shift the first N elements from the array
		 */
		shiftN(n: number): T[]
		/**
		 * Functional version of shiftN
		 */
		shiftNF(n: number): T[]
		/**
		 * Removes all elements matching value
		 */
		remove(value: T): T[]
		/**
		 * Functional version of sort
		 */
		sortF(sorter: (a: number, b: number) => number): T[]
		/**
		 *
		 */
		toSet(): Set<T[]>
	}
}

// Returns the same type as args
type ArrayDifferenceType = <T extends Array<sany>>(...arrays: T[][]) => T[]

Array.difference = (...arrays) => arrays.reduce((a, b) => a.filter((c) => b.excludes(c)))

Array.intersection = (...arrays) =>
	arrays.reduce((a, b) => b.filter(Set.prototype.has.bind(new Set(a))))

Array.mapN = (n: number, fn: () => sany) => Array(n).fill(undefined).map(fn)

Array.reduceN = (n: number, fn: (acc: sany) => sany, initial: sany) =>
	Array(n).fill(undefined).reduce(fn, initial)

Object.defineProperties(Array.prototype, {
	copy: {
		value: function () {
			return Object.copy(this)
		},
		enumerable: false,
	},

	deDup: {
		value: function () {
			return Array.from(new Set(this))
		},
		enumerable: false,
	},

	duplicateCheck: {
		value: function () {
			return new Set(this).size !== this.length
		},
		enumerable: false,
	},

	excludes: {
		value: function (val: sany) {
			return !this.includes(val)
		},
		enumerable: false,
	},

	keyBy: {
		value: function (key: string | number | symbol) {
			// Manually reduce insted of using Array.reduce for performance
			const reduced: Record<string, sany[]> = {}
			for (const entry of this) {
				if (!reduced[entry[key]]) reduced[entry[key]] = [entry]
				else reduced[entry[key]].push(entry)
			}
			return reduced
		},
		enumerable: false,
	},

	minus: {
		value: function (...arrs: sany[][]) {
			let i: number
			for (const arr of arrs) {
				for (const el of arr) {
					while ((i = this.indexOf(el)) > -1) {
						this.splice(i, 1)
					}
				}
			}
		},
		enumerable: false,
	},

	minusF: {
		value: function (...arrs: sany[][]) {
			return Array.difference(this, ...arrs)
		},
		enumerable: false,
	},

	popF: {
		value: function () {
			return this.slice(0, -1)
		},
		enumerable: false,
	},

	popN: {
		value: function (n: number) {
			const poped = []
			let i = n
			while (i-- && this.length) poped.push(this.pop())
			return poped
		},
		enumerable: false,
	},

	popNF: {
		value: function (n: number) {
			return this.slice(0, -n)
		},
		enumerable: false,
	},

	pushF: {
		value: function (...vals: sany[]) {
			return this.concat(vals)
		},
		enumerable: false,
	},

	remove: {
		value: function (el: sany) {
			let i: number
			while ((i = this.indexOf(el)) > -1) {
				this.splice(i, 1)
			}
		},
		enumerable: false,
	},

	shiftF: {
		value: function () {
			return this.slice(1)
		},
		enumerable: false,
	},

	shiftN: {
		value: function (n: number) {
			return this.splice(n)
		},
		enumerable: false,
	},

	shiftNF: {
		value: function (n: number) {
			return this.slice(n)
		},
		enumerable: false,
	},

	sortF: {
		value: function (sorter: (a: number, b: number) => number) {
			return [...this].sort(sorter)
		},
		enumerable: false,
	},

	toSet: {
		value: function () {
			return new Set(this)
		},
		enumerable: false,
	},
})
