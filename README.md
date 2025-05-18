# 🪶 @slimr monorepo

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css) - Framework agnostic css-in-js features inspired by the popular Emotion lib
- [@slimr/forms](https://www.npmjs.com/package/@slimr/forms) - An enhanced HTML form with auto-disabling, auto-reset, error handling, more JS events, and context to its children.
- [@slimr/markdown](https://www.npmjs.com/package/@slimr/markdown) - A simple component and slim markdown-to-html parser
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths) - A basic Icon component and Material Design icon svg paths, code-split by path.
- [@slimr/react](https://www.npmjs.com/package/@slimr/react) - A collection of useful 1st and third party react components, hooks, and util. Includes
  several other @slimr libs for convenience
- [@slimr/router](https://www.npmjs.com/package/@slimr/router) - A novel React-web router that supports stack routing
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled) - css-in-js features inspired by the popular styled-components and Chakra-UI libs
- [@slimr/swr](https://www.npmjs.com/package/@slimr/swr) - A React hook for fetching data that supports stale-while-refresh eager rendering
- [@slimr/util](https://www.npmjs.com/package/@slimr/util) - Framework agnostic Javascript polyfills

## Demo

`npm run build && npm start`

See [packages/demo/README.md](packages/demo/README.md)

## Publishing

- `npm publish` is usually done manually and per package.

- There is a convenience script, `npm run publish:changed`, which will detect all changes and bump impacted workspaces. For example, if one changed `@slimr/css`, both that and `@slimr/styled` need be bumped because `@slimr/styled` depends on `@slimr/css`. Note that build must be ran first.
