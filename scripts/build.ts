/** Build workspace packages in dependency order so dirty and included packages stay in sync. */
import { parseArgs } from "node:util"
import { execPromise } from "./util/process"
import {
	runWorkspaceTaskPhases,
	selectWorkspaceTaskWorkspaces,
	type WorkspaceTaskSelection,
} from "./util/workspace-task.ts"
import { getWorkspaces } from "./util/workspaces.ts"

/************************************************************************
 * Globals
/************************************************************************/

const usage = `
Usage: deno run --allow-read --allow-write scripts/build-workspaces.ts [options]

Options:
  -h, --help        Show this help message
  -a, --all         Build all workspaces (except excluded)
  -d, --dirty     Only build workspaces that have dirty or depend on dirty workspaces
  -e, --exclude     Exclude a workspace name, or part of, from being built
  -i, --include     Include a workspace name, or part of, for building
`

/************************************************************************
 * Types
/************************************************************************/

/************************************************************************
 * Entry point(s)
/************************************************************************/

/**
 * Builds packages based on the selected workspace set and dependency order.
 */
export async function buildWorkspaces(p: WorkspaceTaskSelection = {}) {
	console.log("[BUILD]:start")

	// If no flags, default to nothing
	if (!p.all && !p.dirty && !p.include) {
		console.log("[BUILD]: No packages selected for build. Use --all, --dirty, or --include.")
		return []
	}

	const workspaces = await getWorkspaces()
	const toBuild = selectWorkspaceTaskWorkspaces(workspaces, p, {
		includeDependents: true,
		workspaceFilter: (workspace) => workspace.name !== "@slimr/mdi-paths",
	})

	console.log(`[BUILD]: Packages to build: ${toBuild.map((w) => w.name).join(", ")}`)

	await runWorkspaceTaskPhases("BUILD", toBuild, async (workspace) => {
		console.log(`[BUILD]: ${workspace.name}@${workspace.config.version}...`)
		console.log(await execPromise("npm run build", { cwd: workspace.path }))
	})

	console.log("BUILD:end")
	return toBuild
}

/** The entrypoint if called directly (aka import.meta.main = true) */
async function main() {
	const pa = parseArgs({
		options: {
			all: { type: "boolean", short: "a" },
			dirty: { type: "boolean", short: "d" },
			exclude: { type: "string", short: "e", multiple: true },
			include: { type: "string", short: "i", multiple: true },
		},
	})
	if (!pa.values.all && !pa.values.dirty && !pa.values.include) {
		console.log(usage)
		return
	}
	await buildWorkspaces(pa.values)
}

if (import.meta.main) main()
