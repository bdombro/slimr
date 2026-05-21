export type SessionListener = () => void | Promise<void>

/** Runs listeners concurrently; returns settlements for deferred error propagation. */
export async function runListenersSettled(
	listeners: Set<SessionListener>,
): Promise<PromiseSettledResult<void>[]> {
	if (listeners.size === 0) return []
	return Promise.allSettled([...listeners].map((listener) => listener()))
}

/** Throws the first rejection after teardown completes (Option A). */
export function throwListenerRejections(results: PromiseSettledResult<void>[]) {
	const rejected = results.find(
		(result): result is PromiseRejectedResult => result.status === "rejected",
	)
	if (rejected) throw rejected.reason
}
