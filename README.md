# 🪶 @slimr monorepo

`@slimr` is a set of slim React (hence '@slimr') libs:

- `packages/css` - Framework agnostic css-in-js features inspired by the popular Emotion lib
- `packages/demo` - One demo to rule them all! A React+Vite demo app.
- `packages/forms` - A minimalistic form hook
- `packages/markdown` - A simple component and slim markdown-to-html parser
- `packages/mdi-paths` - A basic Icon component and Material Design icon svg paths, code-split by path.
- `packages/react` - A collection of useful 1st and third party react components, hooks, and util. Includes
  several other @slimr libs for convenience
- `packages/router` - A novel React-web router that supports stack routing
- `packages/styled` - css-in-js features inspired by the popular styled-components and Chakra-UI libs
- `packages/swr` - A React hook for fetching data that supports stale-while-refresh eager rendering
- `packages/util` - Framework agnostic Javascript polyfills

## Publishing

- There is a convenience script, `npm run publish:changed`, which will detect all changes and bump impacted workspaces. For example, if one changed `@slimr/css`, both that and `@slimr/styled` need be bumped because `@slimr/styled` depends on `@slimr/css`. Note that build must be ran first.
