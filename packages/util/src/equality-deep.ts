import fde from "fast-deep-equal"

/**
 * Checks if two values are deeply equal.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 */
export const areEqualDeep = fde

/**
 * Checks if two values are not deeply equal.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 */
export const areNotEqualDeep: typeof fde = (a, b) => !fde(a, b)
