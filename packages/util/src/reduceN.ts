// You must export something or TS gets confused.
export {}

declare global {
  /**
   * Alias for Array(n).fill(undefined).reduce(fn, initial)
   */
  function reduceN<T>(n: number, fn: (acc: T) => T, initial: T): T[]
}

globalThis.reduceN = function (n: number, fn: (acc: any) => any, initial: any) {
  return Array(n).fill(undefined).reduce(fn, initial)
}
