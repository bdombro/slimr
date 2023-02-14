import {diff} from 'deep-object-diff'
import fde from 'fast-deep-equal/react.js'
// @ts-ignore - no types available
import fse from 'fast-shallow-equal'

/**
 * Checks if two values are deeply equal.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @param debug - If true, logs the diff to the console.
 */
export function areEqualDeep(a: any, b: any, debug?: boolean): boolean {
  if (debug) console.debug(diff(a, b))
  return fde(a, b)
}

/**
 * Checks if two values are not deeply equal.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @param debug - If true, logs the diff to the console.
 */
export const areNotEqualDeep: typeof areEqualDeep = (a, b, debug) => !areEqualDeep(a, b, debug)

/**
 * Checks if two values are shallowly equal. Checks a little more than
 * normal equal (i.e. ===), but faster than deep equal.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @param debug - If true, logs the diff to the console.
 */
export function areEqualShallow(a: any, b: any, debug?: boolean): boolean {
  if (debug) console.debug(diff(a, b))
  return fse(a, b)
}

/**
 * Checks if two values are shallowly non-equal. Checks a little more than
 * normal equal (i.e. ===), but faster than deep equal.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @param debug - If true, logs the diff to the console.
 */
export const areNotEqualShallow: typeof areEqualShallow = (a, b, debug) =>
  !areEqualDeep(a, b, debug)
