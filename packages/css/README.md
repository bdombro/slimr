# @slimr/css [![npm package](https://img.shields.io/npm/v/@slimr/css.svg?style=flat-square)](https://npmjs.org/package/@slimr/css)

A tiny alternative to the popular emotion library

Demos: See `./packages/demo` or [CodeSandbox](https://codesandbox.io/s/64r9px?file=/src/App.tsx)

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css)
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths)
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled)

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
