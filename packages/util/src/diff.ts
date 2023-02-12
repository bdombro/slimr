/*

This lib is adapted from deep-object-diff 1.1.9 + some of the open PRs

Mods:
- unbundled
- fully typescript

Future:
- maybe add support for Sets, Maps, react objects and more like fast-deep-equal.

*/

const isDate = (d: any) => d instanceof Date
const isEmpty = (o: any) => Object.keys(o).length === 0
const isObject = (o: any) => o != null && typeof o === 'object'
const hasOwnProperty = (o: any, ...args: string[]) =>
  // @ts-expect-error - spread is confusing TS
  Object.prototype.hasOwnProperty.call(o, ...args)
const isEmptyObject = (o: any) => isObject(o) && isEmpty(o)
const makeObjectWithoutPrototype = () => Object.create(null)

export type DiffFnc = <L, R>(
  lhs: L,
  rhs: R
) => Partial<{[K in keyof (L & R)]: (L & R)[K] | undefined}>

/**
 * returns only the values added to the updated object
 */
export const addedDiff: DiffFnc = (lhs: any, rhs: any) => {
  if (lhs === rhs || !isObject(lhs) || !isObject(rhs)) return {}

  if (lhs === rhs || !isObject(lhs) || !isObject(rhs)) return {}

  return Object.keys(rhs).reduce((acc, key) => {
    if (hasOwnProperty(lhs, key)) {
      const difference = addedDiff(lhs[key], rhs[key])

      if (isObject(difference) && isEmpty(difference)) return acc

      acc[key] = difference
      return acc
    }

    acc[key] = rhs[key]
    return acc
  }, makeObjectWithoutPrototype())
}

/**
 * returns only the values deleted in the updated object
 */
export const deletedDiff: DiffFnc = (lhs: any, rhs: any) => {
  if (lhs === rhs || !isObject(lhs) || !isObject(rhs)) return {}

  return Object.keys(lhs).reduce((acc, key) => {
    if (hasOwnProperty(rhs, key)) {
      const difference = deletedDiff(lhs[key], rhs[key])

      if (isObject(difference) && isEmpty(difference)) return acc

      acc[key] = difference
      return acc
    }

    acc[key] = undefined
    return acc
  }, makeObjectWithoutPrototype())
}

/**
 * returns an object with the added, deleted and updated differences
 */
export function detailedDiff<L extends Object, R extends Object>(lhs: L, rhs: R) {
  return {
    added: addedDiff(lhs, rhs),
    deleted: deletedDiff(lhs, rhs),
    updated: updatedDiff(lhs, rhs),
  }
}

/**
 * returns the difference of the original and updated objects
 */
export const diff: DiffFnc = (lhs: any, rhs: any): any => {
  if (lhs === rhs) return {} // equal return no diff

  if (Number.isNaN(lhs) && Number.isNaN(rhs)) return {} // NaN is equal

  if (!isObject(lhs) || !isObject(rhs)) return rhs // return updated rhs

  const deletedValues = Object.keys(lhs).reduce((acc, key) => {
    if (!hasOwnProperty(rhs, key)) {
      acc[key] = undefined
    }

    return acc
  }, makeObjectWithoutPrototype())

  if (isDate(lhs) || isDate(rhs)) {
    if (lhs.valueOf() === rhs.valueOf()) return {}
    return rhs
  }

  return Object.keys(rhs).reduce((acc, key) => {
    if (!hasOwnProperty(lhs, key)) {
      acc[key] = rhs[key] // return added r key
      return acc
    }

    const difference = diff(lhs[key], rhs[key])

    // If the difference is empty, and the lhs is an empty object or the rhs is not an empty object
    if (
      isEmptyObject(difference) &&
      !isDate(difference) &&
      (isEmptyObject(lhs[key]) || !isEmptyObject(rhs[key]))
    )
      return acc // return no diff

    acc[key] = difference // return updated key
    return acc // return updated key
  }, deletedValues)
}

/**
 * returns only the values that have been changed in the updated object
 */
const updatedDiff: DiffFnc = (lhs: any, rhs: any) => {
  if (lhs === rhs) return {}

  if (!isObject(lhs) || !isObject(rhs)) return rhs

  if (isDate(lhs) || isDate(rhs)) {
    if (lhs.valueOf() == rhs.valueOf()) return {}
    return rhs
  }

  return Object.keys(rhs).reduce((acc, key) => {
    if (hasOwnProperty(lhs, key)) {
      const difference = updatedDiff(lhs[key], rhs[key])

      // If the difference is empty, and the lhs is an empty object or the rhs is not an empty object
      if (
        isEmptyObject(difference) &&
        !isDate(difference) &&
        (isEmptyObject(lhs[key]) || !isEmptyObject(rhs[key]))
      )
        return acc // return no diff

      acc[key] = difference
      return acc
    }

    return acc
  }, makeObjectWithoutPrototype())
}
