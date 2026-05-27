import { useEffect, useState } from "react"

export function useColorScheme() {
	const mql = globalThis.matchMedia?.("(prefers-color-scheme:dark)")
	const [dark, setDark] = useState(!!mql?.matches)

	useEffect(() => {
		const mql = globalThis.matchMedia?.("(prefers-color-scheme:dark)")
		const updateColorScheme = () => {
			setDark(!!mql?.matches)
		}
		mql?.addEventListener("change", updateColorScheme)
		return () => {
			mql?.removeEventListener("change", updateColorScheme)
		}
	}, [])

	return { dark, light: !dark, scheme: dark ? "dark" : "light" }
}
