/* eslint-disable @typescript-eslint/no-explicit-any */
/** Super sany -- avoids eslint errors. Use sparingly! */
type sany = any
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Should be fixed at some point */
type TSFIXME = sany

type Fnc = (...args: any[]) => any

type PromiseFnc = (...args: any[]) => Promise<any>

type ReturnType<T extends Fnc> = T extends (...args: any[]) => infer R ? R : never

// eslint-disable-next-line @typescript-eslint/ban-types
type ReturnTypeLoose<T extends Function> = T extends (...args: any[]) => infer R ? R : never

type ReturnTypeP<T extends (...args: any[]) => any> = ThenArg<ReturnType<T>>
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T

/**
 * Make all properties in T never
 */
type Never<T> = {
  [P in keyof T]?: never
}
/**
 * Make properties either normal or never
 */
type AllOrNothing<T> = T | Never<T>

/**
 * Accepts any type that's not an array
 */
type NonArray =
  | {
      length?: never
      [key: string]: any
    }
  | string
  | bigint
  | number
  | boolean

