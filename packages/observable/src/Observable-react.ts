import { useMemo, useReducer, useRef, useSyncExternalStore } from "react"
import { Observable } from "./Observable.js"

/**
 * React-friendly {@link Observable}: same pub/sub API, plus `use()` as sugar for {@link useObservable}.
 *
 * For library-owned state (e.g. dbsync), prefer base `Observable` from `@slimr/observable` and `useObservable($)` in components.
 *
 * @usage
 * ```tsx
 * const count = new ObservableR("count", 0)
 *
 * function Reader() {
 *   const n = count.use()
 *   return <div>{n}</div>
 * }
 * ```
 */
export class ObservableR<T> extends Observable<T> {
	/**
	 * Subscribe in this component and return the current value (delegates to {@link useObservable}).
	 */
	use<S = T>(options?: UseObservableOptions<T, S>): S {
		return useObservable(this, options)
	}
}

export type UseObservableOptions<T, S = T> = {
	/** Server render snapshot of the full value; defaults to `() => source.val`. Override for gates (e.g. `() => false`). */
	getServerSnapshot?: () => T
	/** Subscribe and re-render only when this slice changes (deep equality). */
	select?: (value: T) => S
}

/**
 * Subscribe to a shared {@link Observable} and return its current value in render.
 *
 * Works with any instance from `@slimr/observable` (e.g. app singletons or dbsync `db.auth.*$`).
 * Prefer granular observables over broad combined state.
 */
export function useObservable<T, S = T>(
	source: Observable<T>,
	options?: UseObservableOptions<T, S>,
): S {
	const select = options?.select
	const getSnapshot = () => {
		const value = options?.getServerSnapshot?.() ?? source.val
		return (select ? select(value) : value) as S
	}
	return useSyncExternalStore(
		(onStoreChange) =>
			select
				? source.subscribe(() => onStoreChange(), select)
				: source.subscribe(() => onStoreChange()),
		() => (select ? select(source.val) : source.val) as S,
		getSnapshot,
	)
}

/**
 * A mutable handle whose `.value` triggers a re-render when assigned.
 * Works with compound assignment like `handle.value++`.
 */
export interface UseObservableObserver<T> {
	value: T
	toString(): string
}

/**
 * Local component state (not pub/sub). Assign `handle.value` to re-render.
 */
export function useLocalObservable<T>(initial: T): UseObservableObserver<T> {
	const rerender = useReRender()
	const ref = useRef(initial)
	return useMemo<UseObservableObserver<T>>(
		() => ({
			get value() {
				return ref.current
			},
			set value(next: T) {
				ref.current = next
				rerender()
			},
			toString() {
				return `${ref.current}`
			},
		}),
		[],
	)
}

/**
 * Returns a stable function that triggers a component re-render when called.
 */
function useReRender() {
	const [, dispatch] = useReducer((n: number) => n + 1, 0)
	return dispatch
}
