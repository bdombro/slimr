# 🪶 @slimr/react [![npm package](https://img.shields.io/npm/v/@slimr/react.svg?style=flat-square)](https://npmjs.org/package/@slimr/react)

A collection of useful 1st and third party react components, hooks, and util. Includes several other @slimr libs for convenience

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

## Setup

- Install using normal methods (`npm i`, `yarn i`, ...etc)
- There is a known conflict with vitest, which you can resolve by adding the following to `vite.config.js`

```javascript
export default defineConfig({
  test: {
    deps: {
      inline: ['@slimr/hooks'],
    },
  },
})
```

## API

### Bundled from other libs

- [@slimr/forms](https://www.npmjs.com/package/@slimr/forms) - An enhanced HTML form with auto-disabling, auto-reset, error handling, more JS events, and context to its children.
- [@slimr/markdown](https://www.npmjs.com/package/@slimr/markdown) - A simple component and slim markdown-to-html parser
- [@slimr/router](https://www.npmjs.com/package/@slimr/router) - A novel React-web router that supports stack routing
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled) - css-in-js features inspired by the popular styled-components and Chakra-UI libs
- [@slimr/swr](https://www.npmjs.com/package/@slimr/swr) - A React hook for fetching data that supports stale-while-refresh eager rendering
- [react-use](https://www.npmjs.com/package/react-use) - an excellent collection of hooks

### mergeRefs

Merge React refs so that multiple refs can be used on a single element. Is
used to merge refs from a forwardRef and a local ref from useRef.

Credits: react-merge-refs

```typescript
const MyComponent = forwardRef((props, ref1) => {
 const ref2 = useRef(null)
 return (<div ref={mergeRefs([ref1, ref2])} />)
})
```

### useDeepCompareMemo and useShallowCompareMemo

like react-use's useDeepEffects, but for memos

### useSet2

Returns a set-like object that intercepts the setter function to trigger re-renders on change. Also adds a toggle and reset method. `@slimr/hooks` also exports a `useSet` from `react-use`, which is similar but has a different, less desirable (imho) pattern.

```typescript
function MyComponent() {
  const optionalInitialValue = new Set()
  const [set1, set1Setters] = useSet(optionalInitialValue)
  const set2 = useSet2(optionalInitialValue)

  // Use set2 like you would a vanilla JS Set
```

### useSWR

A hook that accepts a function callback, calls the function and returns a reactive callback state. Uses a cache and will return the cache value if available while waiting for the callback to complete, then update the return on complete. This is often called 'stale-while-refresh' and abbreviated as 'SWR', hence the name of the hook. Source is in [@slimr/swr](https://www.npmjs.com/package/@slimr/swr)

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
