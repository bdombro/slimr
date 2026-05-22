/**
 * Precommit checks: block inconsistent public-package bumps, then check, build, and test dirty workspaces.
 * Use `git commit --no-verify` to bypass the hook intentionally.
 */
import { throwError } from "../util/errors.ts"
import { getWorkspaces, type Workspace } from "../util/workspaces.ts"
import { buildWorkspaces } from "./build.ts"
import { checkWorkspaces } from "./check.ts"
import { testWorkspaces } from "./test.ts"

/** Run the precommit checks for changed public packages and their dependents. */
export async function precommit() {
	const workspaces = await getWorkspaces()
	assertDirtyDependentsWereChanged(workspaces)
	await checkWorkspaces({ dirty: true, exclude: ["demo"] })
	await buildWorkspaces({ dirty: true, exclude: ["demo"] })
	await testWorkspaces({ dirty: true, exclude: ["demo"] })
}

/** Ensure that if a package is dirty, all of its public dependents are also dirty. */
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
