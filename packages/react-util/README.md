# 🪶 @slimr/react-util [![npm package](https://img.shields.io/npm/v/@slimr/react-util.svg?style=flat-square)](https://npmjs.org/package/@slimr/react-util)

A slim collection of React hooks and utilities.

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

## API

### mergeRefs

Merge React refs so that multiple refs can be used on a single element.

```typescript
const MyComponent = forwardRef((props, ref1) => {
  const ref2 = useRef(null)
  return (<div ref={mergeRefs([ref1, ref2])} />)
})
```

### Observable

Provides a variable with observable capabilities, like pub/sub and React hook integration.

```tsx
const myObservable = new Observable('myObservable', 0);
myObservable.subscribe((newValue) => { console.log('New value:', newValue); });
setTimeout(() => { myObservable.val = 42; }, 1000);
setTimeout(() => { myObservable.set(50); }, 2000);
setTimeout(() => { myObservable.set(last => last + 1); }, 3000);

function MyComponent() {
  myObservable.use();
  return <div>{myObservable.value}</div>;
}
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

### useObservable

Returns a mutable handle whose `.value` triggers a re-render when assigned. Supports compound assignment (`handle.value++`) and implicit string coercion.

```tsx
function Counter() {
  const count = useObservable(0)
  return <button onClick={() => count.value++}>{count}</button>
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
