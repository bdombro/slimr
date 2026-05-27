import { useEffect, useRef } from "react"

/**
 * Like useEffect, but skips running the effect on the initial render.
 * Runs only when dependencies change after mount.
 *
 * @example
 * ```typescript
 * function MyComponent({ id }: { id: string }) {
 *   const [data, setData] = useState(null)
 *   useUpdateEffect(() => {
 *     fetchData(id).then(setData)
 *   }, [id])
 * }
 * ```
 */
// biome-ignore lint/suspicious/noConfusingVoidType: matches React's useEffect callback signature
export function useUpdateEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
	const isFirst = useRef(true)

	useEffect(() => {
		if (isFirst.current) {
			isFirst.current = false
			return
		}
		return effect()
	}, deps)
}
