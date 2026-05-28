/** Build workspace packages in dependency order so dirty and included packages stay in sync. */
import { $ } from "bun"
import { execPromise } from "../util/process.ts"
import {
	runWorkspaceTaskPhases,
	selectWorkspaceTaskWorkspaces,
	type WorkspaceTaskSelection,
} from "../util/workspace-task.ts"
import { getWorkspaces } from "../util/workspaces.ts"

/** Builds packages based on the selected workspace set and dependency order. */
export async function buildWorkspaces(selection: WorkspaceTaskSelection = {}) {
	console.log("[BUILD]:start")

	const workspaces = await getWorkspaces()
	const toBuild = selectWorkspaceTaskWorkspaces(workspaces, selection, {
		includeDependents: true,
		workspaceFilter: (workspace) => workspace.name !== "@slimr/mdi-paths",
	})

	console.log(
		`[BUILD]: Packages to build: ${toBuild.map((workspace) => workspace.name).join(", ")}`,
	)

	await runWorkspaceTaskPhases("BUILD", toBuild, async (workspace) => {
		console.log(`[BUILD]: ${workspace.name}@${workspace.config.version}...`)
		console.log(await execPromise("bun run build", { cwd: workspace.path }))
	})

	console.log("BUILD:end")
	return toBuild
}
