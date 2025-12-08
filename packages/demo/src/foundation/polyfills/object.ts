import {
	areEqualDeep,
	areEqualShallow,
	areNotEqualDeep,
	areNotEqualShallow,
	copy,
	detailedDiff,
	merge,
	mergeAndCompare,
	mergeAndConcat,
} from "@slimr/util"

declare global {
	interface ObjectConstructor {
		/**
		 * A deep equal comparison. Is more expensive than === and areEqualShallow
		 * though, so use it intensionally.
		 */
		areEqualDeep: typeof areEqualDeep

		/**
		 * A deep equal comparison. Is more expensive than === and areEqualShallow
		 * though, so use it intensionally.
		 */
		areNotEqualDeep: typeof areNotEqualDeep

		/**
		 * A shallow equal comparison. Is more expensive than === while less than
		 * areEqualDeep though, so use it intensionally.
		 */
		areEqualShallow: typeof areEqualShallow

		/**
		 * A shallow equal comparison
		 */
		areNotEqualShallow: typeof areNotEqualShallow

		/**
		 * Make a deep copy of an object so that none of the references are the same
		 */
		copy: typeof copy

		/**
		 * returns an object with the added, deleted and updated differences
		 */
		diff: typeof detailedDiff

		/**
		 * Converts an object from a nested structure to a flat structure. Is the opposite
		 * of Object.nestify
		 *
		 * Status: Omitted to reduce bundle size. If needed, install and link
		 *
		 * @reference
		 * https://github.com/mesqueeb/flatten-anything
		 *
		 * @example
		 * ```js
		 * const target = {
		 *    name: 'Ho-oh',
		 *    types: { fire: true, flying: true }
		 * }
		 *
		 * Object.flatten(target)
		 * // returns {
		 * //  'name': 'Ho-oh',
		 * //  'types.fire': true,
		 * //  'types.flying': true,
		 * //}
		 * ```
		 */
		flatten: sany

		/**
		 * Deep merge ....objects. Arrays are clobbered
		 *
		 * If you want to merge arrays, use Object.mergeAndConcat
		 */
		merge: typeof merge

		/**
		 * Deep merge with custom compare function
		 *
		 * There might be times you need to tweak the logic when two things are merged. You can provide your own custom function that's triggered every time a value is overwritten.
		 *
		 * For this case we use mergeAndCompare. Here is an example with a compare function that concatenates strings:
		 *
		 * @example
		 * ```js
		 * import { mergeAndCompare } from 'merge-anything'
		 *
		 * function concatStrings(originVal, newVal, key) {
		 *   if (typeof originVal === 'string' && typeof newVal === 'string') {
		 *     // concat logic
		 *     return `${originVal}${newVal}`
		 *   }
		 *   // always return newVal as fallback!!
		 *   return newVal
		 * }
		 *
		 * mergeAndCompare(concatStrings, { name: 'John' }, { name: 'Simth' })
		 * // returns { name: 'JohnSmith' }
		 * ```
		 *
		 * Note for TypeScript users. The type returned by this function might not be correct. In that case you have to cast the result to your own provided interface
		 */
		mergeAndCompare: typeof mergeAndCompare

		/**
		 * Deep merge ...objects. Arrays are merged too.
		 *
		 * If you want to clobber arrays, use `Object.merge`
		 */
		mergeAndConcat: typeof mergeAndConcat

		/**
		 * Converts an object from a flat structure to a nested structure. Is the opposite
		 * of Object.flattenify
		 *
		 * Status: Omitted to reduce bundle size. If needed, install and link
		 *
		 * @reference
		 * https://github.com/mesqueeb/nestify-anything
		 *
		 * @example
		 * ```js
		 * const target = {
		 *   'name': 'Ho-oh',
		 *   'types.fire': true,
		 *   'types.flying': true,
		 * }
		 *
		 * Object.nestify(target)
		 * // returns {
		 * //   name: 'Ho-oh',
		 * //   types: { fire: true, flying: true }
		 * // }
		 * ```
		 */
		nestify: sany

		/** Return obj excluding attributes by keys  */
		omit<T extends Record<string, sany>, K extends keyof T>(
			obj: T,
			keys: readonly K[] | K[],
		): Omit<T, K>

		/**
		 * Return obj excluding attributes based on a filter function
		 *
		 * @param obj - the object to filter
		 * @param filter - the filter function. Takes the attribute name and value as arguments to return true to keep the attribute
		 * @param inPlace - if true, the object will be modified in place. Otherwise, a new object will be returned
		 */
		omitCustom<T extends Record<string, sany>>(
			obj: T,
			filter: (attrName: string, attrVal: sany) => sany,
		): T

		/** Return obj excluding attrs with falsey values */
		omitFalseyAttrs<T extends Record<string, sany>>(obj: T, inPlace?: boolean): Partial<T>

		/** Return obj excluding attrs with null values */
		omitNullAttrs<T extends Record<string, sany>>(obj: T, inPlace?: boolean): Partial<T>

		/** Return obj excluding attrs with undefined values */
		omitUndefAttrs<T extends Record<string, sany>>(obj: T, inPlace?: boolean): Partial<T>

		/** Return obj only including attributes by keys */
		pick<T extends Record<string, sany>, K extends keyof T>(
			obj: T,
			keys: readonly K[] | K[],
		): Pick<T, K>
	}
}

Object.areEqualDeep = areEqualDeep
Object.areNotEqualDeep = areNotEqualDeep
Object.areEqualShallow = areEqualShallow
Object.areNotEqualShallow = areNotEqualShallow

Object.copy = copy

Object.diff = detailedDiff

Object.flatten = () => {
	throw new Error("Omitted to save bundle size")
}

Object.merge = merge
Object.mergeAndCompare = mergeAndCompare
Object.mergeAndConcat = mergeAndConcat

Object.nestify = () => {
	throw new Error("Omitted to save bundle size")
}

Object.omit = (obj, keys) => {
	const res = Object.assign({}, obj)
	keys?.forEach((k) => {
		if (k in obj) delete res[k]
	})
	return res
}

Object.omitCustom = (obj, filter) => {
	const obj2 = Object.copy(obj)
	for (const key in obj2) {
		if (!filter(key, obj2[key])) delete obj2[key]
	}
	return obj2
}

Object.omitFalseyAttrs = (obj) => Object.omitCustom(obj, (_, val) => val)

Object.omitNullAttrs = (obj) => Object.omitCustom(obj, (_, val) => val !== null)

Object.omitUndefAttrs = (obj) => Object.omitCustom(obj, (_, val) => val !== undefined)

Object.pick = (obj, keys) => {
	const res: sany = {}
	keys?.forEach((k) => {
		if (k in obj) res[k] = obj[k]
	})
	return res
}
