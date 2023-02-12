// You must export something or TS gets confused.
export {}

declare global {
  /**
   * Alias for Array(n).fill(undefined).map(fn)
   */
  function mapN<T>(n: number, fn: () => T): T[]
}

globalThis.mapN = function (n: number, fn: () => any) {
  return Array(n).fill(undefined).map(fn)
}
