/**
 * Utils for Enums attached to global namespace
 */

// You must export something or TS gets confused.
export {}

declare global {
	var Enum: {
		/**
		 * Gets enum values from enum
		 *
		 * Object.values(enum) returns Keys and Values for some reason, so this corrects that.
		 *
		 * @param enum0 Incoming enum
		 */
		getEnumValues: (enumFrom: Record<string, sany>) => sany[]
		/**
		 * Creates an enum-like object from a class instance
		 */
		getEnumFromClassInstance: <T extends Object>(classInstance: T) => Record<keyof T, keyof T>
	}
}

globalThis.Enum = {
	getEnumValues,
	getEnumFromClassInstance,
}

function getEnumValues(enumFrom: Record<string, sany>): sany[] {
	const vals = Object.entries(enumFrom)
		// If enum values are number type, Object.entries() will emit it also
		// as a key, which we don't want so filter them out.
		.filter(([key]) => Number.isNaN(Number(key)))
		.map(([, val]) => val)
	return vals
}

function getEnumFromClassInstance<T extends Object>(classInstance: T): Record<keyof T, keyof T> {
	return Object.keys(classInstance).reduce<sany>((acc, k) => {
		acc[k] = k
		return acc
	}, {}) as Record<keyof T, keyof T>
}
