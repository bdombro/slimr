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

When testing UI components, mounting a full `DbSync` instance with an IndexedDB polyfill can be slow. It is often easier to mock the `@slimr/dbsync/react` hooks directly.

```tsx
import { vi } from "vitest"
import { useDbQuery, useDbSession } from "../src/dbHooks" // your bound hooks

vi.mock("../src/dbHooks", () => ({
    useDbQuery: vi.fn(),
    useDbSession: vi.fn(),
}))

test("renders loading skeleton when not ready", () => {
    vi.mocked(useDbSession).mockReturnValue({ isReady: false, isLoggedIn: true })
    const { getByTestId } = render(<AppShell />)
    expect(getByTestId("skeleton")).toBeInTheDocument()
})

test("renders posts", () => {
    vi.mocked(useDbSession).mockReturnValue({ isReady: true, isLoggedIn: true })
    vi.mocked(useDbQuery).mockReturnValue({
        loading: false,
        value: [{ id: "1", content: "Mocked post" }]
    })
    
    const { getByText } = render(<PostList />)
    expect(getByText("Mocked post")).toBeInTheDocument()
})
```

## See also

- [LocalAdapter](./LocalAdapter.md)
- [React](./React.md)