# @slimr/router [![npm package](https://img.shields.io/npm/v/@slimr/router.svg?style=flat-square)](https://npmjs.org/package/@slimr/router)

A tiny alternative to react-router with some novel features like stack routing and scroll restore

<!--
Demos: See `./examples/css-and-styled` or [CodeSandbox](https://codesandbox.io/s/64r9px?file=/src/App.tsx)
-->

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css)
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths)
- [@slimr/router](https://www.npmjs.com/package/@slimr/router)
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled)

Features:

- No dependencies, 3kb min+gziped
- Stack routing -- a route "stack" can have it's own history like react native's react-navigation
- Auto handles all link clicks to same-site and back/popstate without needing to use a Link component
- Fosters/facilitates type-safe linking (no broken links!)
- Attempts to scroll restore -- usually works so long as your pages use stale-while-refresh
- Less is more: faster, less bugs, no breaking changes
- Enhanced lazy-loading -- reduces and sometimes eliminates flicker between route changes

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
