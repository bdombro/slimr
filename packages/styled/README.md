# @ustyle/styled

A tiny (2kb) React css-in-js library inspired by chakra-ui, emotion, and styled-components libs

Demos: See `./packages/demo` or [CodeSandbox](https://codesandbox.io/s/64r9px?file=/src/App.tsx)

Sister libs:

- [@ustyle/css](https://www.npmjs.com/package/@ustyle/css)

Pros:

- Much less bundle size and runtime sluggishness
- Less is more: less bugs, no breaking changes
- Supports declaring styled components inside of Components for better code colocating and NO MORE NEED TO PASS ARGS!
- Styled shortcuts like styled.div when imported from `@ustyle/styled/withHtmlTags`. Note: To get types you'll need tsconfig:moduleResolution >= `Node16`
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
npm i @ustyle/styled
```

## Usage

Preview below. For full code, see demos

```tsx
// Create primitive components if you like
interface ButtonProps extends Omit<HtmlTagProps['button'], 'id'> {
  id: HtmlTagProps['button']['id'] // make required
}
function Button(props: ButtonProps) {
  return (
    <button
      {...props}
      onClick={(e) => {
        console.log(`Button ${props.id} clicked`)
        props.onClick?.(e)
      }}
    />
  )
}
const ButtonP = styled(Button)`
  bg: red;
  c: white;
  w: [100%, null, inherit];
`

export function App() {
  const on = useOscillator()

  return (
    <ButtonP
      css={`
        --font-weight: [bold, null, initial];
      `}
      id="my-button"
      zx={{
        fontWeight: 'var(--font-weight)',
        textTransform: on ? 'uppercase' : 'inherit',
      }}
    >
      Click me!
    </ButtonP>
  )
}
```

### Comparisons

#### [Chakra-UI](https://chakra-ui.com/)

- A popular css-in-js lib that inspired this lib

Pros

- More mature, SSR support
- Premade components

Cons

- Is crazy large bundle impact

#### [Styled-Components](https://github.com/styled-components/styled-components)

- A popular css-in-js lib that inspired this lib

Pros

- More mature, SSR support

Cons

- Is massive (~12kb), plus has dependency on emotion (~11kb)
- Does not support zx prop or css shorthand props

#### [Emotion](https://emotion.sh/docs/introduction)

- A popular css-in-js lib similar to styled-components

Pros

- More mature, SSR support

Cons

- Is large (>10kb)
- Many features require addons, which make bundle even larger
- Does not support zx prop or css shorthand props

#### [Goober](https://github.com/cristianbote/goober)

- another tiny 1kb styled-components like css-in-js

Pros:

- More mature, SSR support

Cons:

- Many features require addons, which in sum may make the bundle larger than ustyle
- Does not support zx prop or css shorthand props
