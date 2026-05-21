import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { createUseDbQuery, useDbQuery } from "./useDbQuery.js"

/** Renders a component that consumes useDbQuery so the suite can verify subscription-driven re-fetches without depending on browser storage timing. */
describe("useDbQuery", () => {
	/** Clears the DOM between cases so each render assertion starts fresh. */
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
	})

	/** Small component that turns hook results into visible text for assertions. */
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

	/** Confirms the hook renders the initial query result after mount and reports loading while pending. */
	test("loads initial data", async () => {
		let subscriber: ((stores: string[]) => void) | undefined
		const db = {
			isReady: true,
			subscribe: (callback: (stores: string[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		const currentPosts = [{ id: "1", content: "hello world" }]
		const queryFn = vi.fn(async () => currentPosts)

		render(<PostList currentDb={db} queryFn={queryFn} />)

		expect(screen.getByText("loading")).not.toBeNull()
		expect(await screen.findByText("hello world")).not.toBeNull()
		expect(screen.getByText("ready")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(1)
		expect(subscriber).toBeDefined()
	})

	/** Confirms the hook reports null data once a query resolves to undefined. */
	test("normalizes undefined results to null", async () => {
		const db = {
			isReady: true,
			subscribe: () => ({ close: vi.fn() }),
		}
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

	/** Confirms the hook re-runs the query whenever the subscribed store changes. */
	test("reacts to subscription updates", async () => {
		let subscriber: ((stores: string[]) => void) | undefined
		const db = {
			isReady: true,
			subscribe: (callback: (stores: string[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		let currentPosts = [{ id: "1", content: "initial value" }]
		const queryFn = vi.fn(async () => currentPosts)

		render(<PostList currentDb={db} queryFn={queryFn} />)
		expect(screen.getByText("loading")).not.toBeNull()
		expect(await screen.findByText("initial value")).not.toBeNull()
		expect(screen.getByText("ready")).not.toBeNull()

		currentPosts = [{ id: "2", content: "reactive update" }]
		await act(async () => {
			subscriber?.(["posts"])
		})

		expect(await screen.findByText("reactive update")).not.toBeNull()
		expect(screen.getByText("ready")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(2)
	})

	/** Confirms a DbSync-bound hook preserves inference and delegates to the shared implementation. */
	test("creates a DbSync-bound query hook", async () => {
		let subscriber: ((stores: string[]) => void) | undefined
		const db = {
			isReady: true,
			subscribe: (callback: (stores: string[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		const useBoundQuery = createUseDbQuery(db as any)
		const queryFn = vi.fn(async () => [{ id: "1", title: "hello" }])

		function BoundQuery() {
			const { value, loading } = useBoundQuery("todos", queryFn)
			return (
				<div>
					<span>{loading ? "loading" : "ready"}</span>
					<span>{value?.[0]?.title}</span>
				</div>
			)
		}

		render(<BoundQuery />)

		expect(screen.getByText("loading")).not.toBeNull()
		expect(await screen.findByText("hello")).not.toBeNull()
		expect(subscriber).toBeDefined()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})

	/** Confirms shouldRefetchFilter can skip refetches when changes are irrelevant. */
	test("skips refetch when shouldRefetchFilter returns false", async () => {
		let subscriber: ((stores: string[], changes?: any[]) => void) | undefined
		const db = {
			isReady: true,
			subscribe: (callback: (stores: string[], changes?: any[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
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
			subscriber?.(["posts"], [{ table: "posts", change: "update", id: "other-post" }])
		})

		expect(queryFn).not.toHaveBeenCalled()
	})

	/** Confirms shouldRefetchFilter allows refetches when changes match. */
	test("refetches when shouldRefetchFilter returns true", async () => {
		let subscriber: ((stores: string[], changes?: any[]) => void) | undefined
		const db = {
			isReady: true,
			subscribe: (callback: (stores: string[], changes?: any[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
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
			subscriber?.(["posts"], [{ table: "posts", change: "update", id: "1" }])
		})

		expect(await screen.findByText("updated")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})

	/** Confirms missing changes still refetch on table hit when filter is provided. */
	test("refetches on table hit when changes are omitted", async () => {
		let subscriber: ((stores: string[], changes?: any[]) => void) | undefined
		const db = {
			isReady: true,
			subscribe: (callback: (stores: string[], changes?: any[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
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
			subscriber?.(["posts"])
		})

		expect(await screen.findByText("cross-tab")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(1)
	})
})
