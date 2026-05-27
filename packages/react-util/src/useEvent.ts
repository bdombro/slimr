import { useEffect } from "react"

/**
 * Adds a global window event listener on mount and removes it on unmount.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   useEvent("keydown", (e) => console.log(e.key))
 * }
 * ```
 */
export function useEvent<E extends Event = Event>(event: string, handler: (event: E) => void) {
	useEffect(() => {
		window.addEventListener(event, handler as (event: Event) => void)
		return () => window.removeEventListener(event, handler as (event: Event) => void)
	}, [event, handler])
}
