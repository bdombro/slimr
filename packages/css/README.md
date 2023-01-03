# @ustyle/css

A tiny alternative to the popular emotion library

Demos: See `./packages/demo` or [CodeSandbox](https://codesandbox.io/s/64r9px?file=/src/App.tsx)

Sister libs:

- [@ustyle/styled](https://www.npmjs.com/package/@ustyle/styled)

Pros:

- Much less bundle size
- Less is more: faster, less bugs, no breaking changes
- Css shorthand props like [chakra-ui](https://chakra-ui.com/docs/styled-system/style-props):
  - `m` --> `margin`
  - `mx` --> `margin-inline-start` and end
  - `py` --> `padding-top` and bottom
  - More [here](https://github.com/bdombro/ustyle/blob/65bf012086760b7e481a4064f3be8aea6a098b91/packages/css/src/index.ts#L73)!
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
npm i @ustyle/css
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

### Comparisons

#### [Emotion](https://emotion.sh/docs/introduction)

- A popular css-in-js lib that inspired this lib

Pros

- More mature, SSR support

Cons

- Is huge (>10kb)
- Many features require addons, which make bundle even larger
- Does not support zx prop or css shorthand props
