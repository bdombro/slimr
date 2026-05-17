import { useEffect, useState } from "react"
import type { DbSync } from "./DbSync.js"

/**
 * A React hook that subscribes to one or more `DbSync` tables and natively
 * re-evaluates a strictly typed query function whenever local mutations or
 * background sync events alter the underlying data.
 *
 * @param db The initialized `DbSync` instance.
 * @param stores A string or array of strings containing the table names the query function reads from.
 * @param queryFn An asynchronous function invoked to pull data from IndexedDB.
 * @param deps A standard React dependency array for parameters referenced inside the `queryFn`.
 * @returns The resolved data of the `queryFn`, or `undefined` while the initial fetch evaluates.
 */
export function useDbQuery<T>(
	db: DbSync,
	stores: string | string[],
	queryFn: () => Promise<T>,
	deps: any[] = [],
): T | undefined {
	/** Holds the latest query result. */
	const [data, setData] = useState<T | undefined>(undefined)
	/** Normalizes the store input into an array for matching. */
	const storeArray = Array.isArray(stores) ? stores : [stores]

	useEffect(() => {
		let isMounted = true

		const fetchData = async () => {
			if (!db.initted) {
				// If attempting to query before init(), safely wait
				await new Promise<void>((resolve) => {
					const check = setInterval(() => {
						if (!isMounted || db.initted) {
							clearInterval(check)
							resolve()
						}
					}, 50)
				})
			}
			try {
				const result = await queryFn()
				if (isMounted) setData(result)
			} catch (err) {
				console.error("[dbsync useDbQuery]: Query failed", err)
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
	}, [db, JSON.stringify(storeArray), ...deps])

	return data
}
