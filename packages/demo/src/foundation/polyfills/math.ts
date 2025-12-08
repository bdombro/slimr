/**
 * Polyfills for Math
 */

// You must export something or TS gets confused.
export {}

declare global {
	interface Math {
		/**
		 * Returns true or false randomly
		 * @returns - true or false randomly
		 */
		randomBool(): boolean
		/**
		 * Creates a random integer between 0 and max
		 */
		randomInt(max: number, min?: number): number
		/**
		 * Creates a random integer using secure random generator
		 */
		randomIntS(): number
	}
}

Math.randomBool = () => Math.random() > 0.5

Math.randomInt = (max: number, min = 0) => Math.floor(Math.random() * (max - min + 1)) + min

Math.randomIntS = () => {
	const passwordTmp = window.crypto.getRandomValues(new Uint32Array(1))[0]
	return passwordTmp
}
