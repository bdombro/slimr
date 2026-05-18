import { areEqualDeep } from "@slimr/util"
import { useEffect, useState } from "react"
import type { DbSync } from "./DbSync.js"
import { sleep } from "./util/promises.js"

type DbQueryState<T> = {
	value: T | null
	loading: boolean
}

/**
 * A React hook that subscribes to one or more `DbSync` tables and natively
 * re-evaluates a strictly typed query function whenever local mutations or
 * background sync events alter the underlying data.
 *
 * @param db The initialized `DbSync` instance.
 * @param stores A string or array of strings containing the table names the query function reads from.
 * @param queryFn An asynchronous function invoked to pull data from IndexedDB.
 * @param deps A standard React dependency array for parameters referenced inside the `queryFn`.
 * @returns An object containing the latest query result and whether the initial fetch is still pending.
 */
export function useDbQuery<T>(
	db: DbSync,
	stores: string | string[],
	queryFn: () => Promise<T>,
	deps: any[] = [],
): DbQueryState<T> {
	/** Holds the latest query result and loading state. */
	const [state, setState] = useState<DbQueryState<T>>({ value: null, loading: true })
	/** Normalizes the store input into an array for matching. */
	const storeArray = Array.isArray(stores) ? stores : [stores]

	useEffect(() => {
		let isMounted = true

		const fetchData = async () => {
			// If attempting to query before init(), safely wait.
			while (isMounted && !db.initted) await sleep(50)
			if (!isMounted) return
			try {
				const result = await queryFn()
				if (isMounted) {
					const nextValue = result ?? null
					setState((current) => {
						if (!current.loading && areEqualDeep(current.value, nextValue)) {
							return current
						}
						return { value: nextValue, loading: false }
					})
				}
			} catch (err) {
				console.error("[dbsync useDbQuery]: Query failed", err)
				if (isMounted) {
					setState((current) => ({ ...current, loading: false }))
				}
			}
		}

		// Initial fetch
		fetchData()

		// Subscribe to relevant stores
		const sub = db.subscribe((updatedStores) => {
			const shouldUpdate = updatedStores.some((s) => storeArray.includes(s))
			if (shouldUpdate) {
				fetchData()
			}
		})

		return () => {
			isMounted = false
			sub.close()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(storeArray), ...deps])

	return state
}

/** Creates a DbSync-bound query hook so consumers can avoid threading the db instance through every call. */
export function createUseDbQuery(db: DbSync) {
	return function useBoundDbQuery<T>(
		/** One store name or a list of store names that the query depends on. */
		stores: string | string[],
		/** Async function that reads the latest data from IndexedDB. */
		queryFn: () => Promise<T>,
		/** Additional dependencies that should retrigger the query when they change. */
		deps: any[] = [],
	): DbQueryState<T> {
		return useDbQuery(db, stores, queryFn, deps)
	}
}
