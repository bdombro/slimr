import { areEqualDeep } from "@slimr/util"
import { useEffect, useState } from "react"
import type { DbSyncQueryHost } from "../dbSyncLikeType.js"
import { toError } from "../internal/debug.js"
import type { DbUpdatesPayload, RowChange } from "../internal/EventBus.js"

type DbQueryState<T> = {
	value: T | null
	loading: boolean
}

/** Options for fine-grained control over when useDbQuery refetches. */
export type UseDbQueryOptions = {
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
 * @param db The initialized `DbSync` or `DbSyncR` subclass instance.
 * @param tableOrTables A string or array of strings containing the table names the query function reads from.
 * @param queryFn An asynchronous function invoked to pull data from IndexedDB.
 * @param deps A standard React dependency array for parameters referenced inside the `queryFn`.
 * @param options Optional settings such as row-level refetch filtering.
 * @returns An object containing the latest query result and whether the initial fetch is still pending.
 */
export function useDbQuery<T>(
	db: DbSyncQueryHost,
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

		const fetchData = async () => {
			if (!db.auth.canQuery) {
				if (isMounted) setState({ value: null, loading: true })
				return
			}
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
				db.emitDebug({ type: "query:error", tables: tableArray, error: toError(err) })
				if (isMounted) {
					setState((current) => ({ ...current, loading: false }))
				}
			}
		}

		fetchData()

		const unsubCanQuery = db.auth.canQuery$.subscribe(() => fetchData())
		type UpdatesSlice = Pick<DbUpdatesPayload, "tables" | "changes" | "txId">
		const unsubUpdates = db.updates$.subscribe(
			({ tables, changes }: UpdatesSlice) => {
				const tableHit = tables.some((s: string) => tableArray.includes(s))
				if (!tableHit) return

				if (shouldRefetchFilter) {
					if (changes) {
						const relevantChanges = changes.filter((c) => tableArray.includes(c.table))
						if (relevantChanges.length === 0) return
						if (!shouldRefetchFilter(relevantChanges)) return
					}
				}

				fetchData()
			},
			(p: DbUpdatesPayload): UpdatesSlice => ({
				tables: p.tables,
				changes: p.changes,
				txId: p.txId,
			}),
		)

		return () => {
			isMounted = false
			unsubCanQuery()
			unsubUpdates()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(tableArray), shouldRefetchFilter, ...deps])

	return state
}
