import {stringify} from './stringify.js'

/**
 * Converts any plain object, string, number, and more to hash string.
 */
export function hashObj(obj: any) {
  const hash = Math.abs(
    Array.from(typeof obj === 'string' ? obj : stringify(obj)).reduce(
      (hash, char) => 0 | (31 * hash + char.charCodeAt(0)),
      0
    )
  )
  return hash.toString(32)
}
