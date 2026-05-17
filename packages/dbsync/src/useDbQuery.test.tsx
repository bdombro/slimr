import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useDbQuery } from "./useDbQuery.js"

/** Renders a component that consumes useDbQuery so the suite can verify subscription-driven re-fetches without depending on browser storage timing. */
describe("useDbQuery", () => {
	/** Clears the DOM between cases so each render assertion starts fresh. */
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
	})

	/** Small component that turns hook results into visible text for assertions. */
	function PostList({ currentDb, queryFn }: { currentDb: any; queryFn: () => Promise<any[]> }) {
		const posts = useDbQuery(currentDb, "posts", queryFn)
		return (
			<div data-testid="posts">
				{posts?.map((post) => (
					<span key={post.id}>{post.content}</span>
				))}
			</div>
		)
	}

	/** Confirms the hook renders the initial query result after mount. */
	test("loads initial data", async () => {
		let subscriber: ((stores: string[]) => void) | undefined
		const db = {
			initted: true,
			subscribe: (callback: (stores: string[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		const currentPosts = [{ id: "1", content: "hello world" }]
		const queryFn = vi.fn(async () => currentPosts)

		render(<PostList currentDb={db} queryFn={queryFn} />)

		expect(await screen.findByText("hello world")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(1)
		expect(subscriber).toBeDefined()
	})

	/** Confirms the hook re-runs the query whenever the subscribed store changes. */
	test("reacts to subscription updates", async () => {
		let subscriber: ((stores: string[]) => void) | undefined
		const db = {
			initted: true,
			subscribe: (callback: (stores: string[]) => void) => {
				subscriber = callback
				return { close: vi.fn() }
			},
		}
		let currentPosts = [{ id: "1", content: "initial value" }]
		const queryFn = vi.fn(async () => currentPosts)

		render(<PostList currentDb={db} queryFn={queryFn} />)
		expect(await screen.findByText("initial value")).not.toBeNull()

		currentPosts = [{ id: "2", content: "reactive update" }]
		await act(async () => {
			subscriber?.(["posts"])
		})

		expect(await screen.findByText("reactive update")).not.toBeNull()
		expect(queryFn).toHaveBeenCalledTimes(2)
	})
})
