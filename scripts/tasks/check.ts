/** Run workspace checks in dependency order so dirty and included packages are exercised together. */
import { execPromise } from "../util/process.ts"
import {
	runWorkspaceTaskPhases,
	selectWorkspaceTaskWorkspaces,
	type WorkspaceTaskSelection,
} from "../util/workspace-task.ts"
import { getWorkspaces } from "../util/workspaces.ts"

/** Run checks for the selected workspaces in dependency order. */
export async function checkWorkspaces(selection: WorkspaceTaskSelection = {}) {
	console.log("[CHECK]:start")

	const workspaces = await getWorkspaces()
	const toTest = selectWorkspaceTaskWorkspaces(workspaces, selection, {
		workspaceFilter: (workspace) =>
			Boolean(workspace.config.scripts.lint || workspace.config.scripts.typecheck),
	})

	console.log(`[CHECK]: Packages to check: ${toTest.map((workspace) => workspace.name).join(", ")}`)

	console.log(await execPromise("bun biome check --write"))

	await runWorkspaceTaskPhases("CHECK", toTest, async (workspace) => {
		if (workspace.config.scripts.lint) {
			console.log(`[LINT]: ${workspace.name}@${workspace.config.version} -> lint`)
			console.log(await execPromise("bun lint", { cwd: workspace.path }))
		}
		if (workspace.config.scripts.typecheck) {
			console.log(`[TYPECHECK]: ${workspace.name}@${workspace.config.version} -> typecheck`)
			console.log(await execPromise("bun typecheck", { cwd: workspace.path }))
		}
	})

	console.log("CHECK:end")
	return toTest
}
