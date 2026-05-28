# @slimr/observable

Tiny, framework-agnostic pub/sub state — like signals, without tying you to a framework.

| Entry | Import | Use when |
|-------|--------|----------|
| Core | `@slimr/observable` | Shared state, libraries, non-React code |
| React | `@slimr/observable/react` | Hooks, `ObservableR`, component-local state |

```bash
npm install @slimr/observable
# React: peer deps `react` + `react-dom`
```

## Naming convention

Observable instances are named with a `$` suffix (e.g. `count$`, `user$`).
This signals reactive state at a glance and is consistent across all `@slimr` packages.

---

## Core (`Observable`)

Each instance has a **unique `name`** (registered on `globalThis.observables[name]` for debugging), a current value via **`val`** / **`set`**, and **`subscribe`** listeners.

Updates run through **`set`** (or `val = …`). Subscribers fire only when the new value is **not deep-equal** to the previous one. Object values returned from **`val`** are frozen — mutate by replacing the root value, not nested fields in place.

```ts
import { Observable } from "@slimr/observable"

const count$ = new Observable("count$", 0)

const unsub = count$.subscribe((n) => console.log(n))
count$.val = 1
await count$.set((n) => n + 1)
unsub()
```

### Subscribing to a slice (`select`)

For compound values, pass a **selector** as the second argument. The callback receives the slice and runs only when that slice changes (deep equality):

```ts
const state$ = new Observable("state$", { bar: 2, man: 3 })

state$.subscribe(
  (man) => console.log("man:", man),
  (s) => s.man,
)

await state$.set((s) => ({ ...s, man: 4 }))   // logs 4
await state$.set((s) => ({ ...s, bar: 99 }))  // silent
```

**Prefer one observable per concern** when you can (`pending$`, `user$`). Use `select` when several fields must live in one atomic snapshot.

---

## React

### `useObservable` — subscribe to a shared observable

Use for singletons or library-owned instances:

```tsx
import type { Observable } from "@slimr/observable"
import { useObservable } from "@slimr/observable/react"

function Gate({ pending$ }: { pending$: Observable<boolean> }) {
  const pending = useObservable(pending$)
  if (pending) return <div>Loading…</div>
  return <App />
}
```

**Slice-only re-renders** — same `select` as `subscribe`:

```tsx
function ManOnly({ state$ }: { state$: Observable<{ bar: number; man: number }> }) {
  const man = useObservable(state$, { select: (s) => s.man })
  return <span>{man}</span>
}
```

### `ObservableR` — app-owned singletons with `.use()`

Subclass of `Observable` with `.use()` as sugar over `useObservable` (supports `select` and `getServerSnapshot`):

```tsx
import { ObservableR } from "@slimr/observable/react"

const gate$ = new ObservableR("gate$", false)

function Gate() {
  const pending = gate$.use()
  if (pending) return <div>Loading…</div>
  return <App />
}
```

For libraries publishing state, stick to base **`Observable`** + consumers call **`useObservable($)`**.

### `useLocalObservable` — component-local state

Not pub/sub. A mutable **`handle.value`** that triggers re-renders on assignment (including `++`):

```tsx
import { useLocalObservable } from "@slimr/observable/react"

function Counter() {
  const count$ = useLocalObservable(0)
  return (
    <button type="button" onClick={() => count$.value++}>
      {count$.value}
    </button>
  )
}
```

### SSR (`getServerSnapshot`)

When the server snapshot should differ from the client’s first paint (e.g. always `false` for a loading gate):

```tsx
const pending = useObservable(syncPending$, {
  getServerSnapshot: () => false,
})

// ObservableR
const pending2 = gate$.use({ getServerSnapshot: () => false })
```

`getServerSnapshot` returns the **full** observable value; `select` is applied when reading the hook result.

---

## Cheat sheet

| Goal | API |
|------|-----|
| Shared mutable cell | `new Observable(name$, initial)` |
| Notify on change | `$.subscribe(cb)` |
| Notify when one field changes | `$.subscribe(cb, select)` |
| Read in React | `useObservable($)` or `$.use()` |
| Re-render on one field | `useObservable($, { select })` |
| Local component state | `useLocalObservable(initial)` |
| SSR-safe first paint | `{ getServerSnapshot: () => … }` |
