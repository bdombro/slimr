# @slimr/swr [![npm package](https://img.shields.io/npm/v/@slimr/swr.svg?style=flat-square)](https://npmjs.org/package/@slimr/swr)

A tiny alternative to the popular emotion library

Demos: See `./examples/css-and-styled` or [CodeSandbox](https://codesandbox.io/s/64r9px?file=/src/App.tsx)

Pros:

- Much less bundle size
- Less is more: faster, less bugs, no breaking changes
- Is progressive -- lazy loads styles along with component if component is lazy
- Css shorthand props like [chakra-ui](https://chakra-ui.com/docs/styled-system/style-props):
  - `m` --> `margin`
  - `mx` --> `margin-left` and bottom
  - `py` --> `padding-top` and bottom
  - More [here](https://github.com/bdombro/slimr/blob/65bf012086760b7e481a4064f3be8aea6a098b91/packages/css/src/index.ts#L73)!
- CSS Breakpoints shorthand like [chakra-ui](https://chakra-ui.com/docs/styled-system/responsive-styles):

  ```css
  margin: [auto, null, inherit];
  /* Translates to */
  margin: auto;
  @media (min-width: 48em) {
    margin: inherit;
  }
  ```

  - Breakpoints are `[30em, 48em, 62em, 80em, 96em]`

Cons:

- No SSR support

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

## Usage

```tsx
// Add some global styles
addCss`
  body {
    color: lightgray;
  }
`

export function App() {
  const on = useOn()

  return (
    <div
      className={css`
        background: white;
        color: ${on ? 'red' : 'initial'};
        &:hover {
          font-weight: bold;
        }
        font-size: [20px, null, 16px];
      `}
    >
      Helo css!
    </div>
  )
}
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
