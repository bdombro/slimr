# 🪶 @slimr/hooks [![npm package](https://img.shields.io/npm/v/@slimr/hooks.svg?style=flat-square)](https://npmjs.org/package/@slimr/hooks)

A collection of tiny, useful react hooks

1. All of npm:react-use, which is an excellently tiny set of hooks
2. `useDeepCompareMemo` and `useShallowCompareMemo`: like react-use's useDeepEffects, but for memos
3. `useForm` from [@slimr/forms](https://www.npmjs.com/package/@slimr/forms)
4. `useSwr` from [@slimr/swr](https://www.npmjs.com/package/@slimr/swr)
5.

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
