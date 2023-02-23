# @slimr/css [![npm package](https://img.shields.io/npm/v/@slimr/css.svg?style=flat-square)](https://npmjs.org/package/@slimr/css)

tiny css-in-js features, inspired by the popular emotion library

Demo: [CodeSandbox](https://codesandbox.io/s/64r9px?file=/src/App.tsx)

Features:

- Much smaller (less bundle size)
- Less is more: faster, less bugs, no breaking changes
- Is progressive -- lazy loads styles
- Css shorthand props like [chakra-ui](https://chakra-ui.com/docs/styled-system/style-props)
- CSS Breakpoints shorthand like [chakra-ui](https://chakra-ui.com/docs/styled-system/responsive-styles):

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

## Setup/Install

```bash
npm i @slimr/css
```

## API

### addCss

Injects css to the page head

- Queues and batches injections for better performance
- Has local cache to recall prior adds, to reduce duplicates and dom changes

```typescript
import { addCSs } from '@slimr/css'
addCss(`.foo { color: green; }`) // queues css for injection
addCss(`.foo { color: green; }`) // ignored bc duplicate
addCss(`.foo { background: purplse`) // queues more css
// the queue will be executed next javascript tick
```

### `css` (alias for `createClass`)

Upserts and returns a unique css class for a given css string

- Leverages addCss under the hood, so very performant
- Supports several css short-hands, inspired by [Chakra-UI's box](https://chakra-ui.com/docs/styled-system/responsive-styles)
- Supports array values for responsive styles, similar to Chakra-UI's box. More [here](https://github.com/bdombro/slimr/blob/65bf012086760b7e481a4064f3be8aea6a098b91/packages/css/src/index.ts#L73)

```typescript
import {createClass, css} from '@slimr/css'
c1 = createClass('c: red;') // queues the create of new css class 's0'
c2 = createClass('c: red;') // is duplicate so will return 's0'
c3 = createClass`c: red;` // same
c4 = css`c: red;` // same
// c1 = c2 = c3 = c4
<div className={css`c: red;`} /> // will resolve to 's0' like above
c5 = css`c: blue;` // queues the create of new css class 's1'
c6 = css`w: [100%, null, 400px]` // width = 100% on mobile and table, 400px on desktop
```

...and the queue will be executed next javascript tick

### `classJoin`

Joins class names and omits falsey props

```typescript
import { classJoin } from '@slimr/css'
classJoin('a', 'b', 'c') // 'a b c'
classJoin('a', 0, 'b', null, 'c') // 'a b c'
```

## Comparisons

### [Emotion](https://emotion.sh/docs/introduction)

- A popular css-in-js lib that inspired this lib

Pros

- More mature, SSR support

Cons

- Is huge (>10kb)
- Many features require addons, which make bundle even larger
- Does not support zx prop or css shorthand props

### [Astroturf](https://astroturfcss.github.io/astroturf/)

- A popular css-in-js lib similar to Emotion but compiles out the css into css stylesheets

Pros

- More performant (zero kbs, no need for caching or Map lookups)
- Support for all the PostCSS magic you may desire

Cons

- Requires babel/bundler config
- Does not support zx prop or css shorthand props
- Is not progressive -- all styles for all components is loaded and blocks initial page paint

### [Linaria](https://linaria.dev/)

- Pretty much identical to Astroturf, but maybe better Vite support
