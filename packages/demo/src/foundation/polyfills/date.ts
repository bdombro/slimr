/**
 * Extensions for Number
 *
 * Note: Extending primitive's can be problematic without care. For more info, see
 * https://stackoverflow.com/questions/8859828/javascript-what-dangers-are-in-extending-array-prototype
 *
 * Tips:
 * 1. for...in will break if you naively extend via Date.propotype.foo = ...
 *    Instead, use Object.defineProperty({value: fnc, enumerable: false})
 * 2. Drop support for older Internet Explorer
 */

// You must export something or TS gets confused.
export {}

declare global {
  interface DateConstructor {
    ONE_DAY_MS: number
    /**
     * Returns the epoch time adjusted for timezone and daylight savings.
     * Inspired by https://stackoverflow.com/a/39584529/1202757
     */
    getUtcTime(date: Date | string | number): number
    /**
     * Calculates the number of days between two dates or date strings
     */
    daysBetween(date1: Date | string | number, date2: Date | string | number): number
  }
  interface Date {
    copy(): Date
  }
}

Object.defineProperties(Date.prototype, {
  copy: {
    value: function () {
      return new Date(this)
    },
    enumerable: false,
  },
})

Date.ONE_DAY_MS = 86400000

Date.getUtcTime = (date: Date | string | number) => {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() - result.getTimezoneOffset())
  return result.getTime()
}

Date.daysBetween = (date1: Date | string | number, date2: Date | string | number) => {
  const res = Math.floor((Date.getUtcTime(date1) - Date.getUtcTime(date2)) / Date.ONE_DAY_MS)
  return res
}
