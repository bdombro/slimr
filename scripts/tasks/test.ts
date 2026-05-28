/** Run workspace tests in dependency order so dirty and included packages are exercised together. */
import { execPromise } from "../util/process.ts"
import {
	runWorkspaceTaskPhases,
	selectWorkspaceTaskWorkspaces,
	type WorkspaceTaskSelection,
} from "../util/workspace-task.ts"
import { getWorkspaces } from "../util/workspaces.ts"

/** Run checks, tests for the selected workspaces in dependency order. */
export async function testWorkspaces(selection: WorkspaceTaskSelection = {}) {
	console.log("[TEST]:start")

	const workspaces = await getWorkspaces()
	const toTest = selectWorkspaceTaskWorkspaces(workspaces, selection, {
		workspaceFilter: (workspace) =>
			Boolean(
				workspace.config.scripts.lint ||
					workspace.config.scripts.typecheck ||
					workspace.config.scripts.test ||
					workspace.config.scripts?.["test:e2e"],
			),
	})

	console.log(`[TEST]: Packages to test: ${toTest.map((workspace) => workspace.name).join(", ")}`)

	await runWorkspaceTaskPhases("TEST", toTest, async (workspace) => {
		if (workspace.config.scripts.lint) {
			console.log(`[LINT]: ${workspace.name}@${workspace.config.version} -> lint`)
			console.log(await execPromise("bun run lint", { cwd: workspace.path }))
		}
		if (workspace.config.scripts.typecheck) {
			console.log(`[TYPECHECK]: ${workspace.name}@${workspace.config.version} -> typecheck`)
			console.log(await execPromise("bun run typecheck", { cwd: workspace.path }))
		}
		if (workspace.config.scripts.test) {
			console.log(`[TEST]: ${workspace.name}@${workspace.config.version} -> test`)
			console.log(await execPromise("bun run test", { cwd: workspace.path }))
		}
		if (workspace.config.scripts?.["test:e2e"]) {
			console.log(`[E2E]: ${workspace.name}@${workspace.config.version} -> test:e2e`)
			console.log(await execPromise("bun run test:e2e", { cwd: workspace.path }))
		}
	})

	// Lint: Do at end to ensure test generated files are formatted
	console.log(await execPromise("bun biome check --write"))

	console.log("TEST:end")
	return toTest
}
