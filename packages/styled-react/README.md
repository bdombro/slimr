# @ustyle/styled-react

A tiny (1kb) alternative to the popular styled-components library for react AND preact

Sister libs:

- @ustyle/css
- @ustyle/styled-preact
- @ustyle/react

Pros:

- Much less bundle size and runtime sluggishness
- Less is more: less bugs, no breaking changes
- Compatible with preact and react
- Supports declaring styled components inside of Components for better code colocating and NO MORE NEED TO PASS ARGS!
- Supports css

Cons:

- No SSR support

## Setup/Install

```bash
npm i @ustyle/styled-react
```

or for preact

```bash
npm i @ustyle/styled-preact
```

## Usage

Preview below. For full code, see demo folder

```tsx
// Add some global styles
css`
  body {
    color: lightgray;
  }
`

// Also works with tab syntax (tss)
css`
 body
  background: black
 @media (width > 500px)
  body
   background: #333
`

export function App() {
  const on = useOn()
  const [ref, width] = useWidth()

  let pColor = ''
  if (width > 400 && width > 800) {
    pColor = on ? 'white' : 'pink'
  } else {
    pColor = on ? 'white' : 'red'
  }

  // Feel free to declare styled components inside components!

  // A basic div with css template string
  const Div = styled.div`
    :self {
      color: #55f;
    }
  `

  // A basic div with tss string and nested component
  const Container = styled.div(`
    :self
      container-type: inline-size
      max-width: 500px
    :self ${Div}
      background: white
  `)

  // A basic div with tab syntax (tss) template string and dynamic color
  const Div2 = styled.div`
  :self
   color: ${pColor}
  @container (width > 400px) and (width > 800px)
   :self
    color: ${pColor}
 `

  // An extension of Div2 with tss template string
  const Div3 = styled(Div2)`
    :self
      background: black
      padding: 10px
  `
  // An extension of Div3 with css string
  const Div4 = styled(Div3)(':self { font-size: 30px; }')

  return (
    <Container forwardRef={ref as any}>
      <Div>This should be blue font with white background</Div>
      <h3>THIS SHOULD BE WHITE</h3>
      <Div4 style={{ textTransform: 'uppercase' }}>
        This should be
        <ul>
          <li>uppercase</li>
          <li>font-size 30</li>
          <li>padding: 10</li>
          <li>background: black</li>
          <li>font color: {pColor}</li>
        </ul>
      </Div4>
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
