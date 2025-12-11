# 🪶 @slimr/router [![npm package](https://img.shields.io/npm/v/@slimr/router.svg?style=flat-square)](https://npmjs.org/package/@slimr/router)

A tiny alternative to [react-router](https://www.npmjs.com/package/react-router) with some novel features like stack routing and scroll restore

Features:

- No dependencies, 3kb min+gziped
- Stack routing -- a route "stack" can have it's own history like react native's react-navigation
- Auto handles all link clicks to same-site and back/popstate without needing to use a Link component
- Fosters/facilitates type-safe linking (no broken links!)
- Attempts to scroll restore -- usually works so long as your pages use stale-while-refresh
- Less is more: faster, less bugs, no breaking changes

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

## Usage

For a more complete example, please see demo in repo at `packages/demo`. Also, do refer to the
extensive in-code comments.

Basic Example:

```typescript
// app.tsx
import {Switch} from '@slimr/router'
import {router} from './router'

export function App() {
  return (
    <Switch router={router} />
  )
}

// router.tsx
import {Router, Switch} from '@slimr/router'

import Home from './pages/index'
import Hello from './pages/hello'
import NotFound from './pages/not-found'


export const router = new Router(
  {
  index: {
    component: Home,
    path: '/',
  },
  hello: {
    component: Hello,
    path: '/hello/:name',
  },
  notFound: {
    exact: false,
    component: NotFound,
    path: '/',
  },
  },
  { }
)

// pages/index.tsx
import {setPageMeta} from '@slimr/util'
import {router as r} from '../router'

export default function Index() {
  const {title, description} = setPageMeta({title: 'Home'})
  const helloHref = router.routes.hello.toPath({name: 'world', foo: 'bar'})
  return (
    <>
      <h1>Home</h1>
      <a href={helloHref}>Goto /hello/world?foo=bar</a>
    </>
  )
}

// pages/hello.tsx
import {setPageMeta} from '@slimr/util'
import type {RouteMatch} from '@slimr/router'

export default function Hello({route}: {route: RouteMatch}) {
  const {title, description} = setPageMeta({
    title: `Hello ${route.urlParams!.name}`,
    description: 'A demo of route with url params.',
  })
  return (
    <>
      <h1>{title}</h1>
      <p>{description}</p>
    </>
  )
}

// pages/not-found.tsx
import {setPageMeta} from '@slimr/util'

export default function NotFound() {
  const {title, description} = setPageMeta({
    title: '404: Not Found',
    description: "Sorry, we can't find that page",
  })
  return (
    <>
      <h1>{title}</h1>
      <p>{description}</p>
    </p>
  )
}

// component that listens for location updates
function LocationText() {
  router.use()
  return <div>Current location: {router.current.route.path}</div>
}
```

## Comparisons

coming soon

### react-router

- A popular react router

Pros

- More mature, SSR support

Cons

- Is bigger bundle than it should be
- No stack route support

### nextjs router

- A popular file-system based router

Pros

- Less setup

Cons

- Requires using nextjs
- No stack route support
- Very inflexible

### react-navigation

- A popular react native router

Pros

- Very flexible and feature rich

Cons

- Is overly hard to learn and maintain
- If using in web, is HUGE bundle impact
