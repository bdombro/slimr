// this file has exports to create an observable and useObservable react hook

import { areEqualDeep } from "@slimr/util"
import { useEffect, useState } from "react"

type ObservableSetter<T> = (value: T) => T

// @ts-expect-error
globalThis.observables = {}

/**
 * Provides a variable with observable capabilities, like pub/sub and React hook integration.
 *
 * @usage
 * ```tsx
 *   const myObservable = new Observable('myObservable', 0);
 *   myObservable.subscribe((newValue) => { console.log('New value:', newValue); });
 *   setTimeout(() => { myObservable.val = 42; }, 1000);
 *   setTimeout(() => { myObservable.set(50); }, 2000);
 *   setTimeout(() => { myObservable.set(last => last + 1); }, 1000);
 *
 *   function MyComponent() {
 *     myObservable.use();
 *     return <div>{myObservable.value}</div>;
 *   }
 * ```
 */
export class Observable<T> {
	name: string
	private _value: T
	private subscribers: Set<(value: T) => void>

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
	 * @returns The new value.
	 */
	async set(setter: ObservableSetter<T>): Promise<void>
	async set(newValue: T): Promise<void>
	async set(newValueOrSetter: any): Promise<void> {
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
	 * @param cb - The callback to be called when the value changes.
	 * @returns
	 */
	subscribe(cb: (value: T) => void): () => void {
		// promisify the callback so it behaves like an async function even if it's not
		// so that we can await all subscribers in publish()
		const cbPromise = async (newValue: T) => cb(newValue)
		this.subscribers.add(cbPromise)
		return () => this.unsubscribe(cb)
	}

	unsubscribe(cb: (value: T) => void): void {
		this.subscribers.delete(cb)
	}

	/**
	 * A React hook to use this observable in a component
	 *
	 * It does not return the value, but subscribes to changes and forces re-render
	 * when the value changes.
	 *
	 * @usage
	 * ```tsx
	 * const myObservable = new Observable('myObservable', 0);
	 *
	 * function MyComponent() {
	 *   myObservable.use();
	 *   return <div>{myObservable.value}</div>;
	 * }
	 * ```
	 */
	use() {
		const [_, setValue] = useState(this.val)
		useEffect(() => this.subscribe(setValue), [])
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
