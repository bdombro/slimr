import { useReducer } from "react"

/**
 * Returns a stable function that triggers a component re-render when called.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const rerender = useReRender()
 *   return <button onClick={rerender}>Force re-render</button>
 * }
 * ```
 */
export function useReRender() {
	const [, dispatch] = useReducer((n: number) => n + 1, 0)
	return dispatch
}
