# @chakra-lite/css

A tiny (1kb) alternative to the popular emotion library for react AND preact

Sister packages:

- @chakra-lite/styled
- @chakra-lite/react

Pros:

- Much less bundle size and runtime sluggishness
- Less is more: less bugs, no breaking changes
- Compatible with preact and react
- Supports declaring css inside of Components for better code colocating and NO MORE NEED TO PASS ARGS!
- Supports css AND tss - a tab based css

Cons:

- No SSR support

## Setup/Install

```bash
npm i @chakra-lite/css
```

Tip: Set `"moduleResolution": "NodeNext"` in tsconfig.json to get the best typescript experience

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

  // Feel free to declare css inside components!
  const fontWeight = on ? 'bold' : 'initial'

  css`
    body
      font-weight: ${fontWeight}
  `
  return <div>This should be black or gray background, lightgray font, {fontWeight} weight</div>
}
```

### Comparisons

#### [Emotion](https://emotion.sh/docs/introduction)

- A popular css-in-js lib that this lib is based on

Pros

- Very feature rich

Cons

- Is large (~11kb)
