# styled-components-lite

A tiny alternative to the popular styled-components library for react AND preact

Pros:

- Much less bundle size and runtime sluggishness
- Less is more: less bugs, no breaking changes
- Compatible with preact and react
- Supports declaring styled components inside of Components for better code colocating and NO MORE NEED TO PASS ARGS!
- Supports css AND tss - a tab based css

Cons:

- Less mature or feature rich

## Setup/Install

```bash
npm i styled-components-lite
```

Tip: Set `"moduleResolution": "NodeNext"` in tsconfig.json to get the best typescript experience

## Usage

Preview below. For full code, see demo folder

```tsx
css`
  body {
    color: lightgray;
  }
`

// Also supports tab-based closures
css`
 body
  background: black
 @media (width > 500px)
  body
   background: #333
`

let renderCount = 0

// TODO: fluid font
export function App() {
  const on = useOn()
  const [ref, width] = useWidth()

  const Div = styled.div`
    :root {
      color: #55f;
    }
  `

  const P = styled.a`
    :root
    color: ${on ? 'white' : 'red'}
    @container (width > 400px) and (width > 800px)
    :root
      color: ${on ? 'white' : 'pink'}
  `

  let expectedColor = ''
  if (width > 400 && width > 800) {
    expectedColor = on ? 'white' : 'pink'
  } else {
    expectedColor = on ? 'white' : 'red'
  }

  return (
    <Container forwardRef={ref as any}>
      <Div>THIS SHOULD BE Blue</Div>
      <h3>THIS SHOULD BE WHITE</h3>
      <P>THIS SHOULD BE {expectedColor.toUpperCase()}</P>
      <p>RenderCount: {renderCount++}</p>
      <p>Container Width: {width}</p>
    </Container>
  )
}
```

### Comparisons

#### [Styled-Components](https://github.com/styled-components/styled-components)

- A popular css-in-js lib that this lib is based on

Pros

- Very feature rich

Cons

- Is massive (~12kb), plus has dependency on emotion (~11kb)

#### [Goober](https://github.com/cristianbote/goober)

- another tiny 1kb styled-components like css-in-js

Pros:

- supports nested css selector syntax (wip for this repo)

Cons:

- Does not support in-component declaring
