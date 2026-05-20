import { areEqualDeep } from "@slimr/util"
import { useEffect, useState } from "react"
import type { DbSync } from "./DbSync.js"
import type { RowChange } from "./internal/EventBus.js"
import { sleep } from "./util/promises.js"

type DbQueryState<T> = {
	value: T | null
	loading: boolean
}

/** Options for fine-grained control over when useDbQuery refetches. */
type UseDbQueryOptions = {
	/**
	 * Return false to skip refetching when the given row changes are not relevant.
	 * Receives only changes for tables the hook subscribes to.
	 * Memoize with `useCallback` when defined inline in a component.
	 */
	shouldRefetchFilter?: (changes: RowChange[]) => boolean
}

/**
 * A React hook that subscribes to one or more `DbSync` tables and natively
 * re-evaluates a strictly typed query function whenever local mutations or
 * background sync events alter the underlying data.
 *
 * @param db The initialized `DbSync` instance.
 * @param tableOrTables A string or array of strings containing the table names the query function reads from.
 * @param queryFn An asynchronous function invoked to pull data from IndexedDB.
 * @param deps A standard React dependency array for parameters referenced inside the `queryFn`.
 * @param options Optional settings such as row-level refetch filtering.
 * @returns An object containing the latest query result and whether the initial fetch is still pending.
 */
export function useDbQuery<T>(
	db: DbSync,
	tableOrTables: string | string[],
	queryFn: () => Promise<T>,
	deps: any[] = [],
	options?: UseDbQueryOptions,
): DbQueryState<T> {
	/** Holds the latest query result and loading state. */
	const [state, setState] = useState<DbQueryState<T>>({ value: null, loading: true })
	/** Normalizes the table input into an array for matching. */
	const tableArray = Array.isArray(tableOrTables) ? tableOrTables : [tableOrTables]
	const shouldRefetchFilter = options?.shouldRefetchFilter

	useEffect(() => {
		let isMounted = true

		const adapter = db.config?.adapter
		const requiresAuth = adapter != null && adapter.requiresAuth !== false

		const fetchData = async () => {
			if (requiresAuth && !db.isLoggedIn) {
				if (isMounted) setState({ value: null, loading: true })
				return
			}
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

		// Subscribe to relevant tables
		const sub = db.subscribe((updatedTables, changes) => {
			const tableHit = updatedTables.some((s) => tableArray.includes(s))
			if (!tableHit) return

			if (shouldRefetchFilter) {
				if (changes) {
					const relevantChanges = changes.filter((c) => tableArray.includes(c.table))
					if (relevantChanges.length === 0) return
					if (!shouldRefetchFilter(relevantChanges)) return
				}
			}

			fetchData()
		})

		return () => {
			isMounted = false
			sub.close()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(tableArray), shouldRefetchFilter, db.isLoggedIn, ...deps])

	return state
}

/** Creates a DbSync-bound query hook so consumers can avoid threading the db instance through every call. */
export function createUseDbQuery(db: DbSync) {
	return function useBoundDbQuery<T>(
		/** One table name or a list of table names that the query depends on. */
		tableOrTables: string | string[],
		/** Async function that reads the latest data from IndexedDB. */
		queryFn: () => Promise<T>,
		/** Additional dependencies that should retrigger the query when they change. */
		deps: any[] = [],
		/** Optional settings such as row-level refetch filtering. */
		options?: UseDbQueryOptions,
	): DbQueryState<T> {
		return useDbQuery(db, tableOrTables, queryFn, deps, options)
	}
}
