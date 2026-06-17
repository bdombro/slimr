# 🪶 @slimr/router [![npm package](https://img.shields.io/npm/v/@slimr/router.svg?style=flat-square)](https://npmjs.org/package/@slimr/router)

A tiny, reactive router for React. ~3kb gzipped. Zero config links. Stack routing. Scroll restore. Built on `@slimr/observable` for first-class reactive state.

**Why this over react-router?** You get stack routing (like react-navigation, but for the web), automatic same-site link interception (no `<Link>` component needed), scroll restoration, and reactive query params — all in a fraction of the bundle.

```bash
npm install @slimr/router
```

## Quick start

```tsx
// router.ts — define your routes
import { Router } from "@slimr/router"

export const router = new Router({
  home:     { path: "/",              exact: true,  component: Home },
  user:     { path: "/user/:id",                   component: User },
  notFound: { path: "/",              exact: false, component: NotFound },
})
```

```tsx
// app.tsx — render the matched route
import { Switch } from "@slimr/router"
import { router } from "./router"

export function App() {
  return <Switch router={router} />
}
```

```tsx
// pages/user.tsx — subscribe to route changes in any component
import { router } from "../router"

export default function User() {
  const route = router.route$.use()        // re-renders when route changes
  return <h1>User {route.urlParams!.id}</h1>
}
```

That's it. No providers. No context wrappers. No nesting.

## Features

### Reactive state via observables

Route and query param state are exposed as `@slimr/observable` instances:

```tsx
const route = router.route$.use()                          // React hook — re-renders on route change
const searchParams = router.searchParams$.use()            // React hook — re-renders on any URL change
const unsubscribe = router.route$.subscribe(cb)            // imperative subscription
const currentMatch = router.route$.val                     // read without subscribing
```

For granular re-renders, use `useObservable` with a selector:

```tsx
import { useObservable } from "@slimr/router"

// Only re-render when urlParams changes
const params = useObservable(router.route$, { select: m => m.urlParams })

// Only re-render when a specific query param changes
const editId = useObservable(router.searchParams$, { select: sp => sp.get("edit") })
```

### Stack routing

Routes can be grouped into a **stack** — a nested history within the page, like native mobile navigation. Navigate forward to push, hit back to pop, or use special hashes to control the stack:

```tsx
const router = new Router({
  photos:        { path: "/photos",         isStack: true, component: Photos },
  "photos.item": { path: "/photos/:id",                  component: PhotoDetail },
  notFound:      { path: "/",               exact: false,  component: NotFound },
})
```

```tsx
<a href="/photos/1">View photo 1</a>       {/* pushes onto stack */}
<a href="/photos/2">View photo 2</a>       {/* pushes onto stack */}
<a href="#back">Back</a>                   {/* pops from stack */}
<a href="#clear">Exit stack</a>            {/* clears stack history */}
```

Stack routing is useful for detail views, multi-step flows, and any UI where you want a "drill-down" navigation pattern without losing the parent page's state.

### Automatic link handling

Every `<a>` tag pointing to the same origin is automatically intercepted — no `<Link>` component required:

```tsx
// These just work:
<a href="/about">About</a>
<a href={router.routes.user.toPath({ id: "42" })}>User 42</a>
<a href="/form#replace">Replace current history entry</a>
```

External links and `target="_blank"` links are left alone. Browser back/forward and `popstate` are handled too.

### Page transitions and Scroll restoration

After a route change, the router (1) applies opacity:1 to the new main and/or restores the scroll position when navigating back. Works with a custom scroll container:

```tsx
const router = new Router(routes, {
  scrollElSelector: "main",   // document.querySelector("main") instead of window
})
```

### Type-safe route linking

Routes are defined as a plain object, so you get autocomplete and compile-time checking on route keys and params:

```tsx
router.routes.user.toPath({ id: "42" })         // "/user/42"
router.routes.user.toPath({ id: "42", tab: "settings" })  // "/user/42?tab=settings"
router.goto(router.routes.user, { id: "42" })    // navigates to /user/42
```

No string-based route names. No broken links at runtime.

### Navigating programmatically

```tsx
router.goto("/about")                              // push a new entry
router.goto(router.routes.user, { id: "42" })     // push with typed params
router.replace("/home")                            // replace current entry
await router.goto("/about")                        // await subscriber notification
```

## API

### `new Router(routes, options?)`

Create a router instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scrollElSelector` | `string` | `undefined` | CSS selector for the scroll container. If set, scroll restoration targets this element instead of `window`. |

### `router.route$`

An `ObservableR<RouteMatch>` that fires when the matched route changes.

| Method | Returns | Description |
|--------|---------|-------------|
| `.use()` | `RouteMatch` | React hook — re-renders component on route change |
| `.subscribe(cb)` | `() => void` | Imperative subscription — returns an unsubscribe function |
| `.val` | `RouteMatch` | Current value — read without subscribing |

### `router.searchParams$`

An `ObservableR<URLSearchParams>` that fires on **every** URL change, including same-route query param changes.

| Method | Returns | Description |
|--------|---------|-------------|
| `.use()` | `URLSearchParams` | React hook — re-renders on any URL change |
| `.subscribe(cb)` | `() => void` | Imperative subscription |
| `.val` | `URLSearchParams` | Current search params |

### `router.routes`

A map of route keys to enhanced route objects.

```tsx
router.routes.user.key           // "user"
router.routes.user.path          // "/user/:id"
router.routes.user.toPath({ id: "42" })  // "/user/42"
router.routes.user.isMatch("/user/42")   // { id: "42" } or false
```

### `router.current`

A live, non-reactive snapshot of the current URL state. Recomputes on every access.

```tsx
router.current.route          // current RouteMatch
router.current.url            // full URL string
router.current.path           // pathname + search
router.current.search         // search string ("?foo=bar")
router.current.searchParams   // URLSearchParams instance
router.current.scrollTop      // current scroll position
```

### `router.goto(route, urlParams?)`

Navigate by pushing a new history entry. Accepts a route object, route key string, or raw path string. Returns `Promise<void>`.

### `router.replace(route, urlParams?)`

Same as `goto` but replaces the current history entry instead of pushing.

### `router.onLoad()`

Called by `<Switch>` after rendering a new route to restore scroll position. You usually don't call this directly.

### `<Switch router={router} />`

Renders the component for the first matching route. Handles scroll restoration automatically.

### `useObservable(router.route$, { select })`

Re-exported from `@slimr/observable/react` for convenience. Subscribe to a slice of the observable value — the component only re-renders when the selected slice changes (deep equality).

## Migrating from v2

| v2 | v3 |
|----|-----|
| `router.use()` | `router.route$.use()` |
| `router.subscribe(fn)` | `router.route$.subscribe(fn)` |
| `router.unsubscribe(fn)` | `const unsub = router.route$.subscribe(fn); unsub()` |
| `<Component route={route} url={url} />` from Switch | `const route = router.route$.use()` inside the component |

## Comparisons

### react-router

Pros: More mature. SSR support. Larger ecosystem.

Cons: Bundle size. No stack routing. Requires `<Link>` components, `<Routes>` wrappers, and nested `<Outlet>` patterns.

### Next.js router

Pros: File-system routing. Built-in SSR/SSG. Zero config for routing.

Cons: Requires Next.js. No stack routing. Inflexible for custom routing patterns.

### react-navigation (React Native)

Pros: Very flexible and feature-rich for native navigation.

Cons: Not designed for the web. Large bundle. Steep learning curve.
