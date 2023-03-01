# 🪶 @slimr/styled [![npm package](https://img.shields.io/npm/v/@slimr/styled.svg?style=flat-square)](https://npmjs.org/package/@slimr/styled)

A tiny (~2kb) React css-in-js library inspired by chakra-ui, emotion, and styled-components libs

Demo: [CodeSandbox](https://codesandbox.io/s/64r9px?file=/src/App.tsx)

Features:

- Easily create React components with styles using familiar syntax
- Much less bundle size and runtime sluggishness than others
- Supports declaring css and styled components inside of Components for better code colocating
- Zx/Css shorthand props like [chakra-ui](https://chakra-ui.com/docs/styled-system/style-props)
- Will favor inline-style for performance reasons, if non-responsive and non-stateful.
- Concise responsive CSS syntax Breakpoints shorthand similar to [chakra-ui](https://chakra-ui.com/docs/styled-system/responsive-styles)
- Import pre-enhanced HTML Elements like `Div` or `A` for profit

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
npm i @slimr/styled
```

## API

### Includes @slimr/css exports

See [npm](https://www.npmjs.com/package/@slimr/css) for more info.

```typescript
import {addCSs, createClass, css} from '@slimr/styled'
addCss('.foo { color: purple }')
c1 = createClass('c: red;')
c4 = css`c: red;`
<div className={css`c: red;`} /> // will resolve to 's0' like above
c6 = css`w: [100%, null, 400px]` // width = 100% on mobile and table, 400px on desktop
```

### ZX and Stateful CSS Props

Props to help style based on CSS state

```typescript
import {styled} from '@slimr/styled'

const MyDiv = styled.div`
  _zx={{color: 'blue}} // applies color = blue
  _active={{color: 'blue'}} // applied on :active
  _dark={{color: 'blue'}} // applied when browser prefers dark modes
  _focus={{color: 'blue'}} // applied on :focus
  _focusVisible={{color: 'blue'}} // applied on :focusVisible
  _focusWithin={{color: 'blue'}} // applied on :focusWithin
  _hover={{color: 'blue'}} // applied on :hover
  _light={{color: 'blue'}} // applied on :light
  _target={{color: 'blue'}} // applied on :target
  _visited={{color: 'blue'}} // applied on :visited
`
```

### Shorthand props

Some styles are available as shorthand -- all of them [here](https://github.com/bdombro/slimr/blob/65bf012086760b7e481a4064f3be8aea6a098b91/packages/css/src/index.ts#L73).

```typescript
import {styled} from '@slimr/styled'
const MyDiv = styled.div`
  _bgColor="blue"
  _c="green"
  _p={18}
  _pos="absolute"
  _w={100}
```

### Responsive Props

Specify responsive styles as arrays, similar to [chakra-ui](https://chakra-ui.com/docs/styled-system/responsive-styles)

Default breakpoints are `[30em, 48em, 62em, 80em, 96em]` and can be overridden by setting `css.breakpoints`

```typescript
import {styled} from '@slimr/styled'
const MyDiv = styled.div`
  _w=[100%, null, 200px] // width = 100% on mobile, tablet. 200px on > tablet
  _zx={{w: ['100%', null, '200px']}} // is equivalent to _w
```

### Pre-Enhanced HTML Elements

Import pre-enhanced HTML Elements like `Div` or `A` for profit. With a few exceptions, most elements
accept ANY CSS style as a prop when prefixed by '\_'

```typescript
import {Div, A} from '@slimr/styled'
<Div _p=[8, null, 18]> // a div with responsive padding
  <P _fontSize={30} _lineHeight="1rem"> // style props
  <A _active={{ scale: 1.5 }} _hover={{ c: 'green' }}> // stateful styles
    I grow during keypress and am green on hover
  </A>
</Div>
```

## Comparisons

### [Chakra-UI](https://chakra-ui.com/)

- A popular css-in-js lib that inspired this lib

Pros

- More mature, SSR support
- Lots of premade components

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
