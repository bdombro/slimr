# 🪶 @slimr/react-util [![npm package](https://img.shields.io/npm/v/@slimr/react-util.svg?style=flat-square)](https://npmjs.org/package/@slimr/react-util)

A slim collection of React hooks and utilities.

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

For pub/sub state, `useObservable`, `ObservableR`, and `useLocalObservable`, see [`@slimr/observable`](../observable/README.md).

## API

### mergeRefs

Merge React refs so that multiple refs can be used on a single element.

```typescript
const MyComponent = forwardRef((props, ref1) => {
  const ref2 = useRef(null)
  return (<div ref={mergeRefs([ref1, ref2])} />)
})
```

### useColorScheme

Returns `{ dark, light, scheme }` that tracks the browser color scheme preference.

```typescript
function MyComponent() {
  const { dark } = useColorScheme()
  return <div>{dark ? 'Dark mode' : 'Light mode'}</div>
}
```

### useDeepCompareMemo and useShallowCompareMemo

Like `useMemo` but with deep/shallow comparison to avoid misfires.

### useEvent

Adds a global window event listener on mount and removes it on unmount.

```typescript
function MyComponent() {
  useEvent("keydown", (e) => {
    console.log(e.key)
  })
}
```

### useMedia

Returns whether a CSS media query matches, and updates reactively on change.

```typescript
function MyComponent() {
  const isSmall = useMedia("(max-width: 768px)")
  return <div>{isSmall ? "Mobile" : "Desktop"}</div>
}
```

### useReRender

Returns a stable function that triggers a component re-render when called.

```typescript
function MyComponent() {
  const rerender = useReRender()
  return <button onClick={rerender}>Force re-render</button>
}
```

### useSet

Returns a reactive `Set` with `toggle` and `reset` methods. Mutations trigger re-renders.

```typescript
function MyComponent() {
  const set = useSet(new Set([1, 2, 3]))
  return <button onClick={() => set.toggle(4)}>{set.size} items</button>
}
```

### useUpdateEffect

Like useEffect, but skips running the effect on the initial render.

```typescript
function MyComponent({ id }: { id: string }) {
  const [data, setData] = useState(null)
  useUpdateEffect(() => {
    fetchData(id).then(setData)
  }, [id])
}
```
