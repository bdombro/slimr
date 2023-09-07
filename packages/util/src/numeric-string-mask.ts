/**
 * Applies a mask to a string of numbers, helpful for phone numbers
 *
 * Grabs all of the numbers out of str into an array, then assembles
 * the mask and replaces the '#' with the numbers in order
 *
 * @example
 * ```typescript
 * numericStringMask('1234567890', '(###) ### - ####') // (123) 456 - 7890
 * numericStringMask('1234567890', '(###) ### - ####') // (123) 456 - 7890
 * numericStringMask('(123)abc45678-90', '(###) ### - ####') // (123) 456 - 7890
 * numericStringMask('1234567890', '(###) ###-####') // (123) 456-7890
 * numericStringMask('11900567890', '(##) #####-####') // (11) 90056-7890
 *
 * // react input usage
 * const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *  e.currentTarget.value = numericStringMask(e.target.value, '(###) ###-####')
 *    // Replaces so we don't add characters past the end of the string,
 *    // and so the user can delete characters
 *    .replace(/-$/, '') // changes '(123) 456-' to '(123) 456'
 *    .replace(/\) $/, '') // changes '(11)' to '(11'
 *    .replace(/\($/, '') // changes '(' to ''
 * }
 * ```
 */
export function numericStringMask(
  /** The string to apply the mask to */
  str: string,
  /** The mask to apply to the string */
  mask: string
) {
  if (!mask) return str

  const numeric = str.replaceAll(/[^\d]/g, '')

  let idx = 0

  const formated = mask
    .split('')
    .map(el => {
      if (el === '#') {
        el = numeric[idx]
        idx++
      }
      return el
    })
    .join('')

  return formated
}
