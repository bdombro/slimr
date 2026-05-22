import type { Observable as ObservableType } from "@slimr/observable"
import { Observable } from "@slimr/observable"
import { DbSync } from "../DbSync.js"
import type { DbSyncAuth } from "../DbSyncAuth.js"
import type { DbSyncSync } from "../DbSyncSync.js"
import type { DbSyncConfig } from "../dbSyncConfig.js"
import type { DbUpdatesPayload } from "../internal/EventBus.js"
import { type ObservableReact, wrapObservable } from "./ObservableReact.js"

/**
 * Maps properties of `T` that are `Observable<U>` to `ObservableReact<U>`.
 */
export type WrapObservables<T> = {
	[K in keyof T]: T[K] extends ObservableType<infer U> ? ObservableReact<U> : T[K]
}

export type DbSyncAuthR = WrapObservables<DbSyncAuth> & DbSyncAuth
export type DbSyncSyncR = WrapObservables<DbSyncSync> & DbSyncSync

/**
 * Instance shape of a `DbSyncR` subclass (observables expose `.use()`).
 * Useful when a value is typed as plain `DbSync` but is known to be `DbSyncR`.
 */
export type DbSyncRInstance<T extends DbSync = DbSync> = Omit<T, "auth" | "sync" | "updates$"> & {
	auth: DbSyncAuthR
	sync: DbSyncSyncR
	updates$: ObservableReact<DbUpdatesPayload>
}

const objectProxyCache = new WeakMap<object, object>()

function wrapObjectObservables<T extends object>(obj: T): WrapObservables<T> & T {
	let proxy = objectProxyCache.get(obj)
	if (!proxy) {
		proxy = new Proxy(obj, {
			get(target, prop, receiver) {
				const value = Reflect.get(target, prop, receiver)
				if (value instanceof Observable) {
					return wrapObservable(value)
				}
				return value
			},
		})
		objectProxyCache.set(obj, proxy)
	}
	return proxy as WrapObservables<T> & T
}

/**
 * React `DbSync` base class: subclass for typed tables, then `new YourDb(config)`.
 * Overrides `auth`, `sync`, and `updates$` so observables expose `.use()` in components.
 */
export class DbSyncR extends DbSync {
	private _authR?: DbSyncAuthR
	private _syncR?: DbSyncSyncR
	private _updatesR?: ObservableReact<DbUpdatesPayload>

	override get auth(): DbSyncAuthR {
		return (this._authR ??= wrapObjectObservables(super.auth))
	}

	override get sync(): DbSyncSyncR {
		return (this._syncR ??= wrapObjectObservables(super.sync))
	}

	// @ts-expect-error -- ObservableReact is subscribe-compatible; adds `.use()` for React
	override get updates$(): ObservableReact<DbUpdatesPayload> {
		return (this._updatesR ??= wrapObservable(super.updates$))
	}

	/**
	 * @param config The backend adapter, schema version, and table definitions.
	 */
	constructor(config: DbSyncConfig) {
		// biome-ignore lint/correctness/noConstructorReturn: inherits DbSync table Proxy from super()
		return super(config) as unknown as DbSyncR
	}
}
