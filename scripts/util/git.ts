/** Thin git helpers used by workspace discovery and dirty-workspace checks. */
import { execPromise } from "./process.ts"

export const git = {
	/** Return the list of files changed in the working tree. */
	getChanged() {
		return execPromise("git diff --name-only HEAD")
	},
	/** Return the list of staged files. */
	getStaged() {
		return execPromise("git diff --name-only --cached")
	},
}
