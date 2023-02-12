/**
 * copy is imperfect, especially with classes. the standard structuredClone is usually enough
 * for plain object, so use that until you need more.
 *
 * If you need more, consider the snippet below or https://github.com/mesqueeb/copy-anything
 */
export const copy = structuredClone

/**
 * Inspired by https://stackoverflow.com/a/46692810/1202757. Tested to work but dunno if any better than structured clone
 */
// export const copy = (obj: any) => {
//   if (obj === null || typeof obj !== 'object' || 'isActiveClone' in obj) return obj
//   switch (obj.constructor) {
//     case Date:
//       return new Date(obj)
//     case Array:
//       return obj.map(Object.copy)
//     case Set:
//       return new Set([...obj].map(Object.copy))
//     case Map:
//       return new Map([...obj.entries()].map(Object.copy))
//     default: // means we have no idea what it is :-/
//       // This is the imperfect part: we can't perfectly copy classes, but we can come close
//       const temp = Object.assign({}, obj)
//       for (const key in obj) {
//         if (Object.prototype.hasOwnProperty.call(obj, key)) {
//           obj['isActiveClone'] = null // prevent cyclical reference
//           temp[key] = Object.copy(obj[key])
//           delete obj['isActiveClone']
//         }
//       }
//       return temp
//   }
// }
