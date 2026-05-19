/**
 * Precommit script that keeps changed public packages and their dependents in sync.
 *
 * It blocks commits when a public package changes without the packages that depend
 * on it, then runs Biome plus dirty-package builds and tests to catch regressions.
 * Use `git commit --no-verify` if you intentionally need to bypass the hook.
 */
import { buildWorkspaces } from "./build.ts"
import { testWorkspaces } from "./test.ts"
import { throwError } from "./util/errors.ts"
import { execPromise } from "./util/process"
import { getWorkspaces, type Workspace } from "./util/workspaces.ts"

/** Run the precommit checks for changed public packages and their dependents. */
export async function precommit() {
	const workspaces = await getWorkspaces()
	assertDirtyDependentsWereChanged(workspaces)
	await execPromise("just check")
	await buildWorkspaces({ dirty: true, exclude: ["demo"] })
	await testWorkspaces({ dirty: true, exclude: ["demo"] })
}

/** Ensure that if a package is dirty, all of its public dependents are also dirty */
function assertDirtyDependentsWereChanged(workspaces: Record<string, Workspace>) {
	const violations = Object.values(workspaces)
		.filter((workspace) => workspace.dirty && !workspace.config.private)
		.map((workspace) => {
			const missingDependents = workspace.wsChildrenAll
				.map((dependentName) => workspaces[dependentName])
				.filter((dependent) => dependent && !dependent.config.private && !dependent.dirty)

			return { missingDependents, workspace }
		})
		.filter(({ missingDependents }) => missingDependents.length > 0)

	if (!violations.length) {
		return
	}

	const message = violations
		.map(({ missingDependents, workspace }) => {
			return `- ${workspace.name} changed, but these public dependents were not changed: ${missingDependents.map((dependent) => dependent.name).join(", ")}`
		})
		.join("\n")

	throwError(
		new Error(
			`Precommit blocked because changed packages require their public dependents to be changed too.\n${message}\nIf you really want to skip this check, use --no-verify.`,
		),
	)
}

if (import.meta.main) precommit()
