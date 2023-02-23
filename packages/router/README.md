# 🪶 @slimr/router [![npm package](https://img.shields.io/npm/v/@slimr/router.svg?style=flat-square)](https://npmjs.org/package/@slimr/router)

A tiny alternative to react-router with some novel features like stack routing and scroll restore

Features:

- No dependencies, 3kb min+gziped
- Stack routing -- a route "stack" can have it's own history like react native's react-navigation
- Auto handles all link clicks to same-site and back/popstate without needing to use a Link component
- Fosters/facilitates type-safe linking (no broken links!)
- Attempts to scroll restore -- usually works so long as your pages use stale-while-refresh
- Less is more: faster, less bugs, no breaking changes
- Enhanced lazy-loading -- reduces and sometimes eliminates flicker between route changes

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

## Usage

coming soon

## Comparisons

coming soon

### react-router

- A popular react router

Pros

- More mature, SSR support

Cons

- Is bigger bundle than it should be
- No scroll restore, especially for lazy loaded routes
- No stack route support

### nextjs router

- A popular file-system based router

Pros

- Less setup

Cons

- Requires using nextjs
- No stack route support
- Very inflexible

### react-navigation

- A popular react native router

Pros

- Very flexible and feature rich

Cons

- Is overly hard to learn and maintain
- If using in web, is HUGE bundle impact
