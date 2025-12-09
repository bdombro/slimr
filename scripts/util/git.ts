import { execPromise } from "./process.ts"

export const git = {
	getChanged() {
		return execPromise("git diff --name-only HEAD")
	},
	getStaged() {
		return execPromise("git diff --name-only --cached")
	},
}
