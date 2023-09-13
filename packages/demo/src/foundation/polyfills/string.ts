/**
 * Extensions for String
 *
 * Note: Extending primitive's can be problematic without care. For more info, see
 * https://stackoverflow.com/questions/8859828/javascript-what-dangers-are-in-extending-array-prototype
 *
 * Tips:
 * 1. for...in will break if you naively extend via String.propotype.foo = ...
 *    Instead, use Object.defineProperty({value: fnc, enumerable: false})
 * 2. Drop support for older Internet Explorer
 */

// You must export something or TS gets confused.
export {}

declare global {
  // interface StringConstructor {
  //   /**
  //    * Create a unique id string
  //    */
  //   uid(): string
  // }
  interface String {
    copy(): string

    /**
     * Checks if a string is in an array or object
     */
    isIn(arrOrObj: sany): boolean
    /**
     * Checks if a string is not in an array or object
     */
    isNotIn(arrOrObj: sany): boolean
  }
}

Object.defineProperties(String.prototype, {
  copy: {
    value: function () {
      return this + ''
    },
    enumerable: false,
  },

  isIn: {
    value: function (arrOrObj: sany) {
      return Array.isArray(arrOrObj) ? arrOrObj.includes(this) : (this as string) in arrOrObj
    },
    enumerable: false,
  },

  isNotIn: {
    value: function (arrOrObj: sany) {
      return !this.isIn(arrOrObj)
    },
    enumerable: false,
  },
})
