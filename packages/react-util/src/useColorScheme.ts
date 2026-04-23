import { useEffect, useState } from "react"

const matchMediaPrefersDark = globalThis.matchMedia?.("(prefers-color-scheme:dark)")

/**
 * Returns the current color scheme and whether dark/light mode is active, updating on
 * system preference changes.
 * Note: depends on the "prefers-color-scheme" media query, which is not supported in all browsers.
 */
export function useColorScheme() {
	const [dark, setDark] = useState(!!matchMediaPrefersDark?.matches)

	useEffect(() => {
		const updateColorScheme = () => {
			setDark(!!matchMediaPrefersDark?.matches)
		}
		matchMediaPrefersDark?.addEventListener("change", updateColorScheme)
		return () => {
			matchMediaPrefersDark?.removeEventListener("change", updateColorScheme)
		}
	}, [])

	return { dark, light: !dark, scheme: dark ? "dark" : "light" }
}
