import {diff} from 'deep-object-diff'
import fde from 'fast-deep-equal'

/**
 * Checks if two values are deeply equal, and logs the diff to the console
 * using [npm:deep-object-diff](https://www.npmjs.com/package/deep-object-diff).
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 */
export function areEqualDebug(a: any, b: any): boolean {
  const equal = fde(a, b)
  console.debug(equal ? '[]' : diff(a, b))
  return equal
}

/**
 * Checks if two values are not deeply equal, and logs the diff to the console
 * using npm:deep-object-diff.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 */
export const areNotEqualDebug: typeof areEqualDebug = (a, b) => !areEqualDebug(a, b)
