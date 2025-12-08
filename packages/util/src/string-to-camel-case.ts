/** Converts a string to camel case */
export function toCamelCase(str: string) {
	return str.replace(/[\s_]+/g, "-").replace(/-./g, (x) => x[1].toUpperCase())
}
