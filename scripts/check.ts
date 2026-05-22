/** Run Biome and workspace typechecks for the selected package set. */
import { parseArgs } from "node:util"
import { git } from "./util/git.ts"
import { execPromise } from "./util/process"
import {
	runWorkspaceTaskPhases,
	selectWorkspaceTaskWorkspaces,
	type WorkspaceTaskSelection,
} from "./util/workspace-task.ts"
import { getWorkspaces } from "./util/workspaces.ts"

/** Selection flags for check, including Biome auto-fix. */
export interface CheckTaskSelection extends WorkspaceTaskSelection {
	fix?: boolean
}

const usage = `
Usage: bun scripts/check.ts [options]

Options:
  -h, --help        Show this help message
  -a, --all         Check all workspaces with a typecheck script (plus root Vite config)
  -d, --dirty       Only check workspaces that are dirty or depend on dirty workspaces
  -e, --exclude     Exclude a workspace name, or part of, from being checked
  -f, --fix         Run Biome with --write to auto-fix lint/format issues
  -i, --include     Include a workspace name, or part of, for checking
`

const rootTypecheckPaths = ["tsconfig.node.json", "vite.config.ts"]

/** Run Biome and typecheck for the selected workspaces in dependency order. */
export async function checkWorkspaces(p: CheckTaskSelection = {}) {
	console.log("[CHECK]:start")

	if (!p.all && !p.dirty && !p.include) {
		console.log("[CHECK]: No packages selected. Use --all, --dirty, or --include.")
		return []
	}

	const biomeCommand = p.fix ? "npx biome check --write" : "npx biome check"
	console.log(`[CHECK]: Running Biome${p.fix ? " (fix)" : ""}...`)
	console.log(await execPromise(biomeCommand))

	const workspaces = await getWorkspaces()
	const toCheck = selectWorkspaceTaskWorkspaces(workspaces, p, {
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

	if (p.all) {
		console.log("[CHECK]: Root Vite config...")
		console.log(await execPromise("npx tsc -b tsconfig.node.json"))
	} else if (p.dirty) {
		const gitChanged = await git.getChanged()
		if (rootTypecheckPaths.some((path) => gitChanged.includes(path))) {
			console.log("[CHECK]: Root Vite config (dirty)...")
			console.log(await execPromise("npx tsc -b tsconfig.node.json"))
		}
	}

	console.log("CHECK:end")
	return toCheck
}

/** Parse CLI arguments and run the workspace check entrypoint. */
async function main() {
	const pa = parseArgs({
		options: {
			all: { type: "boolean", short: "a" },
			dirty: { type: "boolean", short: "d" },
			exclude: { type: "string", short: "e", multiple: true },
			fix: { type: "boolean", short: "f" },
			include: { type: "string", short: "i", multiple: true },
		},
	})

	if (!pa.values.all && !pa.values.dirty && !pa.values.include) {
		console.log(usage)
		return
	}

	await checkWorkspaces(pa.values)
}

if (import.meta.main) main()
