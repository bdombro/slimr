/**
 * Adapted from fast-deep-equal to be easier to debug
 */
export function isEqual(a: any, b: any): boolean {
  if (a === b) return true

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false

    let len: number, i: number
    if (Array.isArray(a)) {
      len = a.length
      if (len != b.length) return false
      for (i = len; i-- !== 0; ) if (!isEqual(a[i], b[i])) return false
      return true
    }

    if (a.constructor === RegExp) {
      if (a.source === b.source && a.flags === b.flags) return true
      return false
    }
    if (a.valueOf !== Object.prototype.valueOf) {
      if (a.valueOf() === b.valueOf()) return true
      return false
    }
    if (a.toString !== Object.prototype.toString) {
      if (a.toString() === b.toString()) return true
      return false
    }

    const keys = Object.keys(a)
    len = keys.length
    if (len !== Object.keys(b).length) return false

    for (i = len; i-- !== 0; ) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false

    for (i = len; i-- !== 0; ) {
      const key = keys[i]

      if (key === '_owner' && a.$$typeof) {
        // React-specific: avoid traversing React elements' _owner.
        //  _owner contains circular references
        // and is not needed when comparing the actual elements (and not their owners)
        continue
      }

      if (!isEqual(a[key], b[key])) return false
    }

    return true
  }

  // true if both NaN, false otherwise
  if (Number.isNaN(a) && Number.isNaN(b)) return true
  // Could also be checked this way:
  if (a !== a && b !== b) return true
  return false
}
