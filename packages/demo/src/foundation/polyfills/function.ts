/**
 * Polyfills for Function
 */
import {debounce, memoize} from '@slimr/util'

// You must export something or TS gets confused.
export {}

declare global {
  interface FunctionConstructor {
    /**
     * Curry's functions
     *
     * Ex.
     * function foo(a: string, b: string, c: number) {console.log(a + b + c)}
     * const hello = curry(foo)('hello', 'world')
     * hello('1') // prints 'helloworld1'
     * hello('2') // prints 'helloworld2'
     */
    curry: typeof curry

    /**
     * Debounce a function
     *
     * Don't call a function until a certain amount of time has passed
     * without it being called.
     *
     * If you want more features, like arg diffing and return values, see
     * memoize
     */
    debounce: typeof debounce

    /**
     * Get the name of the current function.
     */
    getName(): string

    /**
     * Wrap a function with retry logic
     * @param fn - the function to wrap
     * @param maxTries - the maximum number of tries
     * @returns - the wrapped function
     */
    withRetry<T extends Fnc>(
      fn: T,
      maxTries?: number
    ): (...props: Parameters<T>) => Promise<ReturnTypeP<T>>

    /**
     * A memoization wrapper with ttl expiration for cache hits.
     *
     * What: Returns the last response from a function if called again with same props
     * before ttl interval has passed.
     *
     * Compared to other memoization algs (fast-memoize, nano-memoize), is much simpler,
     * shorter, easier to fork/enhance while less perfect and slower for primitive args.
     *
     * If you want more features, like arg diffing and return values, see
     * debounce
     */
    memoize: {
      // eslint-disable-next-line @typescript-eslint/ban-types
      <F extends Fnc>(fn: F, ttl: number): F
      cache: Map<string, {returnValue: sany; expires: number}>
    }
  }
}

function curry<A extends sany[], R>(fn: (...args: A) => R): Curried<A, R> {
  return (...args: sany[]): sany =>
    args.length >= fn.length ? fn(...(args as sany)) : curry((fn as sany).bind(undefined, ...args))
}
Function.curry = curry
type Curried<A extends sany[], R> = <P extends Partial<A>>(
  ...args: P
) => P extends A
  ? R
  : A extends [...SameLength<P>, ...infer S]
  ? S extends sany[]
    ? Curried<S, R>
    : never
  : never

type SameLength<T extends sany[]> = Extract<{[K in keyof T]: sany}, sany[]>

Function.debounce = debounce

Function.getName = () => {
  const stackLine = new Error()!.stack!.split('\n')[2].trim()
  const fncName = stackLine.match(/at Object.([^ ]+)/)?.[1] ?? 'anonymous'
  return fncName
}

Function.memoize = memoize

Function.withRetry = (fn, maxTries = 4) => {
  const p = Promise.promisify(fn)
  return async (...props) => {
    let lastError: sany = new Error()
    for (let tryCount = 0; tryCount < maxTries; tryCount++) {
      try {
        return await p(...props)
      } catch (err) {
        lastError = err
      }
    }
    throw lastError
  }
}
