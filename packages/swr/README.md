# 🪶 @slimr/swr [![npm package](https://img.shields.io/npm/v/@slimr/swr.svg?style=flat-square)](https://npmjs.org/package/@slimr/swr)

A tiny (~600B when bundled) hook that accepts a function callback, calls the function and returns a reactive callback state. Uses a cache and will return the cache value if available while waiting for the callback to complete, then update the return on complete. This is often called 'stale-while-refresh' and abbreviated as 'SWR', hence the name of the hook. Source is in [@slimr/swr](https://www.npmjs.com/package/@slimr/swr).

- Only 440 bytes (minified + gzipped)
- Shows cached data immediately and updates the UI when the callback resolves
- Deduplicates concurrent requests: runs the callback only once if duplicates are requested
- UX: no flickering, no waiting if cached, enables native scroll restoration

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

## Options

- throttle - Throttle threshold in ms: time that the cache is deemed current, to avoid over re-fetching

## Usage

```tsx
import {useSWR} from `@slimr/swr`

function MyComponent({ page }: number) {
  const { result, loading, refresh} = useSWR(() => getPageData(page), [page], {throttle: Infinity})
  if (loading) return null
  return (
    <section>
      <h1>{result.title}</h1>
      <p>{result.description}</h1>
      <button onClick={refresh}>Refresh</button>
    </section>
  )
}
```
