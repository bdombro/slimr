/* eslint-disable require-jsdoc */
import {stringify} from './stringify.js'

/**
 * Quickly converts any plain object, string, number, and more to a 32bit hash number or string
 *
 * @param obj
 * The object to hash
 *
 * @param asString
 * If true, the hash will be converted to base-36 and stringified
 *
 * @example
 * ```typescript
 * hash32('hello world') // 1047750623
 * hash32('hello world', true) // 'hbsxjz'
 * hash32({ hello: 'world' }) // 141133545
 * ```
 *
 * Collisions are possible and likelyhood increases with the number of hashes.
 *
 * Collision odds:
 * - 100 32bit hashes = 1/1,000,000
 * - 927 32bit hashes = 1/10,000
 * - 1921 64bit hashes = 1/10,000,000,000,000 = 1/10 trillion = ~odds of a meteor hitting your house
 *
 * @ref
 * - https://stackoverflow.com/a/34842797
 * - https://stackoverflow.com/a/22429679
 * - https://preshing.com/20110504/hash-collision-probabilities/
 * - https://www.ilikebigbits.com/2018_10_20_estimating_hash_collisions.html
 */
export function hash32(obj: any, asString?: false, seed?: number): number
export function hash32(obj: any, asString: true, seed?: number): string
export function hash32(obj: any, asString = false, seed = 0x811c9dc5) {
  const str = typeof obj === 'string' ? obj : stringify(obj)
  const hash = str
    .split('')
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, seed)
  if (asString) return hash.toString(36)
  return hash
}

/**
 * Quickly converts any plain object, string, number, and more to a 64bit hash number or string
 *
 * @param obj
 * The object to hash
 *
 * @param asString
 * If true, the hash will be converted to base-36 and stringified
 *
 * @example
 * ```typescript
 * hash64('hello world') // 927946135
 * hash64('hello world', true) // 'fch3tj'
 * hash64({ hello: 'world' }) // 1139059049
 * ```
 *
 * _NOTE_ hash64 is not a true 64 bit hash and has higher collision odds than a true 64 bit hash.
 *
 * Collisions are possible and likelyhood increases with the number of hashes.
 *
 * Collision odds:
 * - 100 32bit hashes = 1/1,000,000
 * - 927 32bit hashes = 1/10,000
 * - 1921 64bit hashes = 1/10,000,000,000,000 = 1/10 trillion = ~odds of a meteor hitting your house
 *
 * @ref
 * - https://stackoverflow.com/a/34842797
 * - https://stackoverflow.com/a/22429679
 * - https://preshing.com/20110504/hash-collision-probabilities/
 * - https://www.ilikebigbits.com/2018_10_20_estimating_hash_collisions.html
 */
export function hash64(obj: any, asString?: false, seed?: number): number
export function hash64(obj: any, asString: true, seed?: number): string
export function hash64(obj: any, asString = false, seed = 0x811c9dc5) {
  const str = typeof obj === 'string' ? obj : stringify(obj)
  let hash = hash32(str, false, seed)
  hash = hash + hash32(hash + str, false, seed)
  if (asString) return hash.toString(36)
  return hash
}
