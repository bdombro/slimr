# @slimr/styled [![npm package](https://img.shields.io/npm/v/@slimr/styled.svg?style=flat-square)](https://npmjs.org/package/@slimr/styled)

A tiny (~2kb) React css-in-js library inspired by chakra-ui, emotion, and styled-components libs

Demos: See `./examples/css-and-styled` or [CodeSandbox](https://codesandbox.io/s/64r9px?file=/src/App.tsx)

Pros:

- Much less bundle size and runtime sluggishness
- Less is more: less bugs, no breaking changes
- Supports declaring css and styled components inside of Components for better code colocating and NO MORE NEED TO PASS ARGS!
- Styled shortcuts like styled.div
- Zx/Css shorthand props like [chakra-ui](https://chakra-ui.com/docs/styled-system/style-props):
  - Most HTMLElements are enhanced and exported as pascal-case (i.e. `import {Div, A, Section, Flex} from '@slimr/styled'`)
  - Pass shorthand props or zx props to styled components. This lib will create css classes if complex, passthrough as styles otherwise.
  - `m` --> `margin`
  - `mx` --> `margin-left` and right
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
npm i @slimr/styled
```

## Usage

Preview below. For full code, see demos

```tsx
// Create primitive components if you like
const Box = styled.div`
  pos: relative;
`

interface ButtonProps extends Omit<HtmlTagProps['button'], 'id'> {
  id: HtmlTagProps['button']['id'] // make required
}
function Button(props: ButtonProps) {
  return (
    <button
      {...props}
      onClick={e => {
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
    <Box
      // enjoy chakra-ui like shorthand syntax
      bg={['lightblue', null, 'lightred']}
    >
      <ButtonP
        // use css if you'd like, which gets converted into a css class and attached to this element
        css={`
          --font-weight: [bold, null, initial];
        `}
        id="my-button"
        // kinda like style but accepts shorthand syntax
        _zx={{
          textTransform: on ? 'uppercase' : 'inherit',
        }}
        // Any attr with '_' prefix will be passed to zx
        _fontWeight="var(--font-weight)"
        // like _zx, but applies only on :hover
        _hover={{bg: 'lightblue'}}
        // like _zx, but applies only on :active
        _active={{bg: 'lightblue'}}
        // like _zx, but applies only when browser prefers dark modes
        _dark={{bg: 'lightblue'}}
      >
        Click me!
      </ButtonP>
    </Box>
  )
}
```

## Comparisons

### [Chakra-UI](https://chakra-ui.com/)

- A popular css-in-js lib that inspired this lib

Pros

- More mature, SSR support
- Premade components

Cons

- Is crazy large bundle impact (80+kb)

### [Styled-Components](https://github.com/styled-components/styled-components)

- A popular css-in-js lib that inspired this lib

Pros

- More mature, SSR support

Cons

- Is massive (~12kb), plus has dependency on emotion (~11kb)
- Does not support zx prop or css shorthand props

### [Emotion](https://emotion.sh/docs/introduction)

- A popular css-in-js lib similar to styled-components

Pros

- More mature, SSR support

Cons

- Is large (>10kb)
- Many features require addons, which make bundle even larger
- Does not support zx prop or css shorthand props

### [Goober](https://github.com/cristianbote/goober)

- another tiny 1kb styled-components like css-in-js

Pros:

- More mature, SSR support

Cons:

- Many features require addons, which in sum may make the bundle larger than slimr
- Does not support zx prop or css shorthand props
