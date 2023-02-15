# @slimr/hooks [![npm package](https://img.shields.io/npm/v/@slimr/hooks.svg?style=flat-square)](https://npmjs.org/package/@slimr/hooks)

A set of tiny react hooks

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css)
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths)
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled)

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

## Available hooks

1. All of npm:react-use, which is an excellently tiny set of hooks
2. `useDeepCompareMemo` and `useShallowCompareMemo`
3. `useSwr`
