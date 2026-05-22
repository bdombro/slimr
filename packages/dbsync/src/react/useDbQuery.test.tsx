import { Observable } from "@slimr/observable"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import type { DbUpdatesPayload } from "../internal/EventBus.js"
import { useDbQuery } from "./useDbQuery.js"

const mockDb = (overrides: Record<string, unknown> = {}) => {
	const canQueryListeners = new Set<() => void>()
	const updates$ = new Observable<DbUpdatesPayload>("mock-updates", {
		tables: [],
		txId: 0,
	})
	const auth = {
		canQuery: true,
		canQuery$: {
			val: true,
			subscribe: (cb: () => void) => {
				canQueryListeners.add(cb)
				return () => canQueryListeners.delete(cb)
			},
			set: async (v: boolean) => {
				if (auth.canQuery === v) return
				auth.canQuery = v
				canQueryListeners.forEach((l) => l())
			},
		},
		...(overrides.auth as object | undefined),
	}
	return {
		config: { adapter: { requiresAuth: false } },
		emitDebug: vi.fn(),
		updates$,
		emitUpdate: (tables: string[], changes?: DbUpdatesPayload["changes"]) => {
			const prev = updates$.val
			void updates$.set({
				tables,
				changes,
				txId: prev.txId + 1,
			})
		},
		emitCanQueryChange: () => {
			for (const l of canQueryListeners) l()
		},
		auth,
		...overrides,
	}
}

/** Renders a component that consumes useDbQuery so the suite can verify subscription-driven re-fetches without depending on browser storage timing. */
describe("useDbQuery", () => {
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
	})

	function PostList({ currentDb, queryFn }: { currentDb: any; queryFn: () => Promise<any[]> }) {
		const { value: posts, loading } = useDbQuery(currentDb, "posts", queryFn)
		return (
			<div data-testid="posts">
				<span>{loading ? "loading" : "ready"}</span>
				{posts?.map((post) => (
					<span key={post.id}>{post.content}</span>
				))}
			</div>
		)
	}

	test("loads initial data", async () => {
		const db = mockDb()
		const currentPosts = [{ id: "1", content: "hello world" }]
		const queryFn = vi.fn(async () => currentPosts)

		render(<PostList currentDb={db} queryFn={queryFn} />)

		expect(screen.getByText("loading")).not.toBeNull()
		expect(await screen.findByText("hello world")).not.toBeNull()
		expect(screen.getByText("ready")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})

	test("normalizes undefined results to null", async () => {
		const db = mockDb()
		const queryFn = vi.fn(async () => undefined)

		function EmptyQuery({ currentDb }: { currentDb: any }) {
			const { value, loading } = useDbQuery(currentDb, "posts", queryFn)
			return <div>{loading ? "loading" : value === null ? "null" : "value"}</div>
		}

		render(<EmptyQuery currentDb={db} />)

		expect(screen.getByText("loading")).not.toBeNull()
		expect(await screen.findByText("null")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})

	test("reacts to updates$ subscription", async () => {
		const db = mockDb()
		let currentPosts = [{ id: "1", content: "initial value" }]
		const queryFn = vi.fn(async () => currentPosts)

		render(<PostList currentDb={db} queryFn={queryFn} />)
		expect(screen.getByText("loading")).not.toBeNull()
		expect(await screen.findByText("initial value")).not.toBeNull()
		expect(screen.getByText("ready")).not.toBeNull()

		currentPosts = [{ id: "2", content: "reactive update" }]
		await act(async () => {
			db.emitUpdate(["posts"])
		})

		expect(await screen.findByText("reactive update")).not.toBeNull()
		expect(screen.getByText("ready")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(2)
	})

	test("skips refetch when shouldRefetchFilter returns false", async () => {
		const db = mockDb()
		const queryFn = vi.fn(async () => [{ id: "1", content: "stable" }])
		const shouldRefetchFilter = (changes: any[]) =>
			changes.some((c) => c.change === "clear" || (c.id !== undefined && c.id === "1"))

		function FilteredList({ currentDb }: { currentDb: any }) {
			const { value: posts } = useDbQuery(currentDb, "posts", queryFn, [], {
				shouldRefetchFilter,
			})
			return <span>{posts?.[0]?.content}</span>
		}

		render(<FilteredList currentDb={db} />)
		expect(await screen.findByText("stable")).not.toBeNull()
		queryFn.mockClear()

		await act(async () => {
			db.emitUpdate(["posts"], [{ table: "posts", change: "update", id: "other-post" }])
		})

		expect(queryFn).not.toHaveBeenCalled()
	})

	test("refetches when shouldRefetchFilter returns true", async () => {
		const db = mockDb()
		let currentPosts = [{ id: "1", content: "stable" }]
		const queryFn = vi.fn(async () => currentPosts)
		const shouldRefetchFilter = (changes: any[]) =>
			changes.some((c) => c.id === "1" || c.change === "clear")

		function FilteredList({ currentDb }: { currentDb: any }) {
			const { value: posts } = useDbQuery(currentDb, "posts", queryFn, [], {
				shouldRefetchFilter,
			})
			return <span>{posts?.[0]?.content}</span>
		}

		render(<FilteredList currentDb={db} />)
		expect(await screen.findByText("stable")).not.toBeNull()
		queryFn.mockClear()

		currentPosts = [{ id: "1", content: "updated" }]
		await act(async () => {
			db.emitUpdate(["posts"], [{ table: "posts", change: "update", id: "1" }])
		})

		expect(await screen.findByText("updated")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})

	test("refetches on table hit when changes are omitted", async () => {
		const db = mockDb()
		let currentPosts = [{ id: "1", content: "stable" }]
		const queryFn = vi.fn(async () => currentPosts)
		const shouldRefetchFilter = () => false

		function FilteredList({ currentDb }: { currentDb: any }) {
			const { value: posts } = useDbQuery(currentDb, "posts", queryFn, [], {
				shouldRefetchFilter,
			})
			return <span>{posts?.[0]?.content}</span>
		}

		render(<FilteredList currentDb={db} />)
		expect(await screen.findByText("stable")).not.toBeNull()
		queryFn.mockClear()

		currentPosts = [{ id: "1", content: "cross-tab" }]
		await act(async () => {
			db.emitUpdate(["posts"])
		})

		expect(await screen.findByText("cross-tab")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})

	test("does not refetch when updates$ republishes with a new txId but the same tables/changes", async () => {
		const db = mockDb()
		const queryFn = vi.fn(async () => [{ id: "1", content: "done" }])

		render(<PostList currentDb={db} queryFn={queryFn} />)
		await screen.findByText("done")
		expect(queryFn).toHaveBeenCalledTimes(1)

		const changes = [{ table: "posts", change: "update" as const, id: "post-1" }]
		await act(async () => {
			db.emitUpdate(["posts"], changes)
		})
		expect(queryFn).toHaveBeenCalledTimes(2)
		queryFn.mockClear()

		await act(async () => {
			db.emitUpdate(["posts"], changes)
		})

		expect(queryFn).not.toHaveBeenCalled()
	})

	test("does not refetch when only phase$ would change (canQuery$ stable)", async () => {
		const db = mockDb()
		const queryFn = vi.fn(async () => [{ id: "1", content: "done" }])

		function Counter() {
			useDbQuery(db as any, "posts", queryFn)
			return <span>ok</span>
		}

		render(<Counter />)
		await screen.findByText("ok")
		expect(queryFn).toHaveBeenCalledTimes(1)

		await act(async () => {
			await db.auth.canQuery$.set(true)
		})
		expect(queryFn).toHaveBeenCalledTimes(1)
	})
})
