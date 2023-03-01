# 🪶 @slimr/swr [![npm package](https://img.shields.io/npm/v/@slimr/swr.svg?style=flat-square)](https://npmjs.org/package/@slimr/swr)

A tiny (~600B when bundled) hook that accepts a function callback, calls the function and returns a reactive callback state. Uses a cache and will return the cache value if available while waiting for the callback to complete, then update the return on complete. This is often called 'stale-while-refresh' and abbreviated as 'SWR', hence the name of the hook. Source is in [@slimr/swr](https://www.npmjs.com/package/@slimr/swr).

- Only 440 bytes (minified + gzipped)
- Shows cached data immediately and updates the UI when the callback resolves
- Deduplicates concurrent requests: runs the callback only once if duplicates are requested
- UX: no flickering, no waiting if cached, enables native scroll restoration

## Context

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css) - Framework agnostic css-in-js features inspired by the popular Emotion lib
- [@slimr/forms](https://www.npmjs.com/package/@slimr/forms) - A minimalistic form hook
- [@slimr/hooks](https://www.npmjs.com/package/@slimr/hooks) - A collection of useful 1st and third party react hooks
- [@slimr/markdown](https://www.npmjs.com/package/@slimr/markdown) - A simple component and slim markdown-to-html parser
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths) - A basic Icon component and Material Design icon svg paths, code-split by path.
- [@slimr/router](https://www.npmjs.com/package/@slimr/router) - A novel React-web router that supports stack routing
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled) - css-in-js features inspired by the popular styled-components and Chakra-UI libs
- [@slimr/swr](https://www.npmjs.com/package/@slimr/swr) - A React hook for fetching data that supports stale-while-refresh eager rendering
- [@slimr/util](https://www.npmjs.com/package/@slimr/util) - Framework agnostic Javascript polyfills

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
