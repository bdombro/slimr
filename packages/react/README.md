# 🪶 @slimr/react [![npm package](https://img.shields.io/npm/v/@slimr/react.svg?style=flat-square)](https://npmjs.org/package/@slimr/react)

A collection of useful 1st and third party react components, hooks, and util. Includes several other @slimr libs for convenience

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

- [@slimr/forms](https://www.npmjs.com/package/@slimr/forms) - A minimalistic form hook
- [@slimr/markdown](https://www.npmjs.com/package/@slimr/markdown) - A simple component and slim markdown-to-html parser
- [@slimr/router](https://www.npmjs.com/package/@slimr/router) - A novel React-web router that supports stack routing
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled) - css-in-js features inspired by the popular styled-components and Chakra-UI libs
- [@slimr/swr](https://www.npmjs.com/package/@slimr/swr) - A React hook for fetching data that supports stale-while-refresh eager rendering
- [@slimr/util](https://www.npmjs.com/package/@slimr/util) - Framework agnostic Javascript polyfills
- [react-use](https://www.npmjs.com/package/react-use) - an excellent collection of hooks

### useDeepCompareMemo and useShallowCompareMemo

like react-use's useDeepEffects, but for memos

### useForm, FormError

A hook and custom Error from [@slimr/forms](https://www.npmjs.com/package/@slimr/forms), which returns a Form component and reactive form state.

```tsx
import {FormError, useForm} from '@slimr/forms'
import {formToValues} from '@slimr/util'

function MyForm() {
  const { Form, submitting, submitted, accepted, errors} = useForm()

  const onSubmit = async (e: React.FormEventHandler<HTMLFormElement> => {
    const vals = formToJson(e.target as HTMLFormElement)
    const errors: Record<string, string> = {}
    if (!vals.name) {
      errors.name = 'Name is required'
    }
    if (!vals.terms) {
      errors.checkbox = 'You must agree to the terms'
    }
    if (Object.keys(errors).length) {
      throw new FormError(errors)
    }
  }

  return (
    <Form onSubmit={onSubmit}>
      <input disabled={submitting || accepted} name="name" />
      <div>{errors.name}<div>
      <input disabled={submitting || accepted} name="terms" type="checkbox" />
      <div>{errors.terms}<div>
      <button type="submit">Submit</button>
      <button type="reset">Reset</button>
    </Form>
  )
}
```

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
