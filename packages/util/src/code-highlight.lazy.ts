/**
 * This file is used to lazy load the code highlighter to try really hard
 * to avoid loading highlight.js on pages that don't need it.
 */

/**
 * Highlight code elements using [highlight.js](https://www.npmjs.com/package/highlight.js). This function async + lazy loaded
 * to avoid loading highlight.js on pages that don't need it.
 */
export function highlightCodeElements() {
	return import("./code-highlight.js").then((m) => m.highlightCodeElements())
}
