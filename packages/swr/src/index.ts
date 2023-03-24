import {mapApplyMaxSize, stringify} from '@slimr/util'
import {useEffect, useState} from 'react'

/** A generic promise */
type PromiseType = (...args: any[]) => Promise<any>
/** Gets the return type of a promise */
type ReturnTypeP<T extends PromiseType> = ThenArg<ReturnType<T>>
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T

/** The state of a fetcher */
export interface CacheVal<T extends PromiseType> {
  /** A Normal JS error that is populated on error */
  error?: Error
  /** Any outstanding promise for fetching new data */
  promise?: ReturnType<T>
  /** The latest result from the fetcher */
  result?: ReturnTypeP<T>
  /** The last time this cache item was refreshed */
  updatedAt?: number
}

/**
 * The value stored in the SWR state, which is returned by useSWR
 *
 * @param refresh - A callback that will refresh the UI, call the fetcher, and update cache
 */
interface State<T extends PromiseType> extends CacheVal<T> {
  /**
   * A boolean that is true if the fetcher is in-flight
   */
  loading: boolean
  /**
   * A callback that will refresh the UI, call the fetcher, and update cache
   *
   * @param props - props to pass to the callback. If not provided, the prior props will be re-used
   * @returns a promise of the next value of the fetcher
   */
  refresh: () => ReturnType<T>
}

/**
 * A cache to store prior responses and timestamps
 */
const cache = new Map()
mapApplyMaxSize(cache, 100)

/**
 * A tiny (~600B when bundled) hook that accepts a function callback, calls the function and
 * returns a reactive callback state. Uses a cache and will return the cache value if available
 * while waiting for the callback to complete, then update the return on complete. This is often
 * called 'stale-while-refresh' and abbreviated as 'SWR', hence the name of the hook. Source is
 * in [@slimr/swr](https://www.npmjs.com/package/@slimr/swr).
 *
 * Benefits:
 * - Only 440 bytes (minified + gzipped)
 * - Shows cached data immediately and updates the UI when the callback resolves
 * - Deduplicates concurrent requests: runs the callback only once if duplicates are requested
 * - UX: no flickering, no waiting if cached, enables native scroll restoration
 *
 * @param fetcher - an async callback that returns data. *Data be JSONable*
 * @param props - initial props to pass to the callback (only if callback has arguments)
 * @param options
 * - throttle - Throttle threshold in ms: time that the cache is deemed current, to avoid over re-fetching
 *
 * @returns SWR State
 *
 * @example
 * ```tsx
 * function MyComponent({ page }: number) {
 *   const { result, loading, refresh} = useSWR(() => getPageData(page), [page], {throttle: Infinity})
 *   if (loading) return null
 *   return (
 *     <section>
 *       <h1>{result.title}</h1>
 *       <p>{result.description}</h1>
 *       <button onClick={refresh}>Refresh</button>
 *     </section>
 *   )
 * }
 * ```
 */
export function useSWR<T extends PromiseType>(
  /** An async callback that returns data. *Data must be JSONable* */
  fetcher: T,
  /** props to trigger refresh on change, like useEffectDeep */
  props: any[],
  options: {
    /** Throttle threshold in ms: time that the cache is deemed current, to avoid over re-fetching */
    throttle?: number
  }
): State<T> {
  const {throttle = 3000} = options
  const cacheKey = stringify(props) + fetcher.toString()
  const [state, setState] = useState<State<T>>(() => {
    const hit = cache.get(cacheKey)
    return {...hit, refresh, loading: !!hit?.promise}
  })
  /** A cb to re-run the async function and skip any cache */
  function refresh(hardRefresh = true): ReturnType<T> {
    const hit = cache.get(cacheKey) || ({} as CacheVal<T>)
    if (hit?.promise) {
      return hit.promise
    }
    if (!hardRefresh && hit?.result && hit?.updatedAt && Date.now() - hit.updatedAt < throttle) {
      // @ts-expect-error - TS doesn't like this, but it works
      // return (async () => hit.result)()
      return Promise.resolve(hit.result)
    }

    const onUpdate = (res: CacheVal<T>) => {
      cache.set(cacheKey, res)
      setState({...res, refresh, loading: !!res?.promise})
    }

    hit.promise = fetcher()
      .then(result => {
        onUpdate({result, updatedAt: Date.now()})
        return result
      })
      .catch(error => {
        onUpdate({error, updatedAt: Date.now()})
        throw error
      })

    onUpdate(hit)

    return hit.promise as ReturnType<T>
  }

  useEffect(() => {
    refresh(false)
  }, [cacheKey])

  return state
}
