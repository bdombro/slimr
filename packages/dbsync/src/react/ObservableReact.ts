import type { Observable } from "@slimr/observable"
import { type UseObservableOptions, useObservable } from "@slimr/observable/react"

/**
 * A React-friendly wrapper around an `Observable` that provides a `.use()` method
 * for ergonomic subscription in React components.
 */
export interface ObservableReact<T> {
	readonly name: string
	readonly val: T
	subscribe(listener: (val: T) => void): () => void
	subscribe<S>(listener: (slice: S) => void, select: (val: T) => S): () => void
	set(next: T): void
	use<S = T>(options?: UseObservableOptions<T, S>): S
}

const wrapperCache = new WeakMap<Observable<any>, ObservableReact<any>>()

/**
 * Wraps an `Observable` to provide a `.use()` method.
 * Caches the wrapper so that multiple calls with the same observable return the same wrapper instance.
 */
export function wrapObservable<T>(inner: Observable<T>): ObservableReact<T> {
	let wrapped = wrapperCache.get(inner)
	if (!wrapped) {
		wrapped = {
			get name() {
				return inner.name
			},
			get val() {
				return inner.val
			},
			subscribe: ((listener, select) =>
				select
					? inner.subscribe(listener as (slice: unknown) => void, select as (value: T) => unknown)
					: inner.subscribe(
							listener as unknown as (val: T) => void,
						)) as ObservableReact<T>["subscribe"],
			set: (next) => inner.set(next),
			use: (options) => useObservable(inner, options),
		}
		wrapperCache.set(inner, wrapped)
	}
	return wrapped
}
