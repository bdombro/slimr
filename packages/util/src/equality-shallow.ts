// @ts-ignore - no types available
import fse from 'fast-shallow-equal'

type Fse = (a: any, b: any) => boolean

/**
 * Checks if two values are shallowly equal. Checks a little more than
 * normal equal (i.e. ===), but faster than deep equal.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @param debug - If true, logs the diff to the console.
 */
export const areEqualShallow: Fse = fse

/**
 * Checks if two values are shallowly non-equal. Checks a little more than
 * normal equal (i.e. ===), but faster than deep equal.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @param debug - If true, logs the diff to the console.
 */
export const areNotEqualShallow: Fse = (a, b) => !fse(a, b)
