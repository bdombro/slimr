# @ustyle/css

A tiny (1.3kb) alternative to the popular emotion library for react AND preact

Sister libs:

- @ustyle/styled
- @ustyle/react

Pros:

- Much less bundle size
- Less is more: faster, less bugs, no breaking changes

Cons:

- No SSR support

## Setup/Install

```bash
npm i @ustyle/css
```

## Usage

Preview below. For full code, see demo folder

```tsx
// Add some global styles
css.addCss`
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
        @media (width > 500px) {
          font-size: 20px;
        }
      `}
    >
      Helo css!
    </div>
  )
}
```

### Comparisons

#### [Emotion](https://emotion.sh/docs/introduction)

- A popular css-in-js lib that this lib is based on

Pros

- More mature and feature rich, like SSR support

Cons

- Is large (~8kb)
