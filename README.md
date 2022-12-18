# styled-components-lite

A tiny alternative to the popular styled-components library.

Pros:

- Much less bundle size and runtime sluggishness
- Less is more: less bugs, no breaking changes
- Supports declaring styled components inside of Components for better
  code colocating and NO MORE NEED TO PASS ARGS!
- Supports css AND tss - a tab based css

Cons:

- Less mature or feature rich

## Usage

Preview below. For full code, see example in repo.

```tsx
tss`
  body {/* body comment */}
    background: black
  @media (width > 500px)
    body
      background: #333
`

tss`
  {/* Now for some ugly code!! */}
  
  h1,
  {/* multi-line
      comment 
  */}
  h2,
  h3,h4,
  h5

    color: white
  
`

css`
  body {
    color: lightgray;
  }
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

  const P = tstyled.a`
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
      <p>Transpile Count: 7 &lt;= {transpileAndAddToDom.count}</p>
    </Container>
  )
}
```
