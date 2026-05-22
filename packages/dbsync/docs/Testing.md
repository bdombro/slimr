# Testing

[Documentation index](./README.md)

Because `@slimr/dbsync` relies heavily on browser APIs (`indexedDB`, `BroadcastChannel`, `localStorage`, `navigator.locks`), running automated tests (e.g. in Vitest, Jest, or Node) requires some setup.

## 1. Mocking IndexedDB in Node

If your tests run in Node (like most Vitest or Jest setups), `indexedDB` does not exist globally. You should install `fake-indexeddb` to polyfill it.

```bash
npm install -D fake-indexeddb
```

In your test setup file (e.g., `setup.ts`):

```typescript
import "fake-indexeddb/auto"
```

You may also need to mock `BroadcastChannel` and `localStorage` depending on your test runner's environment (e.g. if using `jsdom` or `happy-dom`, `localStorage` usually exists).

## 2. Using `LocalAdapter` for fast, isolated tests

In your tests, you rarely want to hit a real backend or mock `fetch` requests for every db operation. Instead, construct your test `DbSync` instances using `LocalAdapter`.

```typescript
import { test, expect, beforeEach, afterEach } from "vitest"
import { LocalAdapter } from "@slimr/dbsync/adapters"
import { AppDb } from "../src/db" // your custom DbSync class

let db: AppDb

beforeEach(async () => {
    db = new AppDb({ adapter: new LocalAdapter() })
    await db.waitForBooted() // open IDB and apply migrations
})

afterEach(async () => {
    db.dispose() // Clean up event listeners and timers
    
    // Clear the fake indexedDB between tests to avoid test pollution
    const req = indexedDB.deleteDatabase("dbsync")
    await new Promise((resolve) => {
        req.onsuccess = resolve
        req.onerror = resolve
    })
})

test("can insert and query posts", async () => {
    await db.posts.add({ userId: "1", content: "Test" })
    const posts = await db.posts.find()
    expect(posts).toHaveLength(1)
})
```

## 3. Mocking React Hooks for Component Tests

When testing UI components, mounting a full `DbSync` instance with an IndexedDB polyfill can be slow. It is often easier to mock hooks directly.

**`.use()`** on `DbSyncR` observables delegates to `useObservable` internally, so mocking `@slimr/observable/react` still works. Alternatively mock `db.auth.phase$.use` on a test double.

```tsx
import { vi } from "vitest"
import { useObservable } from "@slimr/observable/react"
import { useDbQuery } from "@slimr/dbsync/react"
import { db } from "./db" // class AppDb extends DbSyncR

vi.mock("@slimr/observable/react", () => ({ useObservable: vi.fn() }))
vi.mock("@slimr/dbsync/react", () => ({ useDbQuery: vi.fn() }))

test("renders loading skeleton when not ready", () => {
    vi.mocked(useObservable).mockImplementation((source) => {
        if (source === db.auth.phase$.val || source.name?.endsWith("-phase")) return "booting"
        return false
    })
    const { getByTestId } = render(<AppShell />)
    expect(getByTestId("skeleton")).toBeInTheDocument()
})

test("renders posts", () => {
    vi.mocked(useObservable).mockImplementation((source) => {
        if (source.name?.endsWith("-phase")) return "ready"
        if (source.name?.endsWith("-isInitialSyncPending")) return false
        return false
    })
    vi.mocked(useDbQuery).mockReturnValue({
        loading: false,
        value: [{ id: "1", content: "Mocked post" }]
    })
    
    const { getByText } = render(<PostList />)
    expect(getByText("Mocked post")).toBeInTheDocument()
})
```

## Playwright (E2E)

The repo includes browser fixtures under `packages/dbsync/playwright/fixtures/` (e.g. `auth-app.ts`) wired for Vitest Playwright or your own E2E runner.

**Stub sync** — avoid real network in auth/sync UI tests:

```typescript
await page.evaluate(() => {
  window.db.sync.setPerformSyncHook(async () => {
    // run minimal logic so sync cycle completes
  })
})
```

Clear the hook when done: `setPerformSyncHook(null)`. See [Debugging](./Debugging.md#e2e--playwright).

**Assert session state** — `page.evaluate(() => window.getState())` returns `phase`, `isLoggedIn`, `syncState`, and listener counts from the auth fixture.

## See also

- [Adapters — LocalAdapter](./Adapters.md#localadapter)
- [React](./React.md)
- [Debugging](./Debugging.md)