import { process } from "./index.ts"

export function getChanged() {
	return process.spawn("git diff --name-only HEAD")
}

export function gitStaged() {
	return process.spawn("git diff --name-only --cached")
}
