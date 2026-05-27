import { useEffect, useState } from "react"

/**
 * Returns whether a CSS media query matches, and updates reactively on change.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isSmall = useMedia("(max-width: 768px)")
 *   return <div>{isSmall ? "Mobile" : "Desktop"}</div>
 * }
 * ```
 */
export function useMedia(query: string) {
	const [matches, setMatches] = useState(() => globalThis.matchMedia(query).matches)

	useEffect(() => {
		const mql = globalThis.matchMedia(query)
		const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
		mql.addEventListener("change", handler)
		return () => mql.removeEventListener("change", handler)
	}, [query])

	return matches
}
