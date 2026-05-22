import { areEqualDeep } from "@slimr/util"

type ObservableSetter<T> = (value: T) => T

// @ts-expect-error
globalThis.observables = {}

/**
 * Provides a variable with observable capabilities, like pub/sub
 *
 * @usage
 * ```tsx
 *   const myObservable = new Observable('myObservable', 0);
 *   myObservable.subscribe((newValue) => { console.log('New value:', newValue); });
 *   setTimeout(() => { myObservable.val = 42; }, 1000);
 *   setTimeout(() => { myObservable.set(50); }, 2000);
 *   setTimeout(() => { myObservable.set(last => last + 1); }, 3000);
 * ```
 */
export class Observable<T> {
	name: string
	private _value: T
	private subscribers: Set<(value: T) => void | Promise<void>>

	constructor(name: string, initialValue: T) {
		this.name = name
		this._value = initialValue
		this.subscribers = new Set()
		// @ts-expect-error
		globalThis.observables[name] = this
	}

	async publish() {
		return Promise.all([...this.subscribers].map((subscriber) => subscriber(this._value)))
	}

	/**
	 * Sets a new value for the observable and notifies subscribers if the value changed.
	 *
	 * @param newValueOrSetter - The new value or a function that takes the current value and returns the new value.
	 */
	async set(setter: ObservableSetter<T>): Promise<void>
	async set(newValue: T): Promise<void>
	async set(newValueOrSetter: T | ObservableSetter<T>): Promise<void> {
		const newValue =
			typeof newValueOrSetter === "function"
				? (newValueOrSetter as ObservableSetter<T>)(this._value)
				: newValueOrSetter
		if (!areEqualDeep(this._value, newValue)) {
			this._value = newValue
			await this.publish()
		}
	}

	/**
	 * Register a callback to be called when the observable value changes.
	 *
	 * @param cb - Called with the full value, or with the selected slice when `select` is provided.
	 * @param select - Optional projector; the callback runs only when the selected slice changes (deep equality).
	 * @returns An unsubscribe function.
	 */
	subscribe(cb: (value: T) => void): () => void
	subscribe<S>(cb: (slice: S) => void, select: (value: T) => S): () => void
	subscribe<S>(cb: (value: T | S) => void, select?: (value: T) => S): () => void {
		let lastSlice: S | undefined
		const wrapped = async (newValue: T) => {
			if (select) {
				const nextSlice = select(newValue)
				if (lastSlice !== undefined && areEqualDeep(lastSlice, nextSlice)) return
				lastSlice = nextSlice
				;(cb as (slice: S) => void)(nextSlice)
				return
			}
			;(cb as (value: T) => void)(newValue)
		}
		this.subscribers.add(wrapped)
		return () => this.subscribers.delete(wrapped)
	}

	get val(): T {
		// Freeze the value to avoid cases where the internal object may be mutated
		// without triggering subscribers.
		return Object.freeze(this._value)
	}
	set val(newValue: T) {
		this.set(newValue)
	}
}
