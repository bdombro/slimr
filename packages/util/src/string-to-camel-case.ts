/** Converts a string to camel case */
export function toCamelCase(str: string) {
  return str.replace(/-./g, x => x[1].toUpperCase())
}
