/** Run Biome and workspace typechecks for the selected package set. */
import { git } from "../util/git.ts"
import { execPromise } from "../util/process.ts"
import {
	runWorkspaceTaskPhases,
	selectWorkspaceTaskWorkspaces,
	type WorkspaceTaskSelection,
} from "../util/workspace-task.ts"
import { getWorkspaces } from "../util/workspaces.ts"

/** Selection flags for check, including Biome auto-fix. */
export interface CheckTaskSelection extends WorkspaceTaskSelection {
	fix?: boolean
}

const rootTypecheckPaths = ["tsconfig.node.json", "vite.config.ts"]

/** Run Biome and typecheck for the selected workspaces in dependency order. */
export async function checkWorkspaces(selection: CheckTaskSelection = {}) {
	console.log("[CHECK]:start")

	const biomeCommand = selection.fix ? "npx biome check --write" : "npx biome check"
	console.log(`[CHECK]: Running Biome${selection.fix ? " (fix)" : ""}...`)
	console.log(await execPromise(biomeCommand))

	const workspaces = await getWorkspaces()
	const toCheck = selectWorkspaceTaskWorkspaces(workspaces, selection, {
		includeDependents: true,
		workspaceFilter: (workspace) => Boolean(workspace.config.scripts?.typecheck),
	})

	console.log(
		`[CHECK]: Packages to typecheck: ${toCheck.map((workspace) => workspace.name).join(", ")}`,
	)

	await runWorkspaceTaskPhases("CHECK", toCheck, async (workspace) => {
		console.log(`[CHECK]: ${workspace.name}@${workspace.config.version} -> typecheck`)
		console.log(await execPromise("npm run typecheck", { cwd: workspace.path }))
	})

	if (selection.all) {
		console.log("[CHECK]: Root Vite config...")
		console.log(await execPromise("npx tsc -b tsconfig.node.json"))
	} else if (selection.dirty) {
		const gitChanged = await git.getChanged()
		if (rootTypecheckPaths.some((path) => gitChanged.includes(path))) {
			console.log("[CHECK]: Root Vite config (dirty)...")
			console.log(await execPromise("npx tsc -b tsconfig.node.json"))
		}
	}

	console.log("CHECK:end")
	return toCheck
}
