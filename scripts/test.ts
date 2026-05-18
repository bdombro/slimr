/** Run workspace tests in dependency order so dirty and included packages are exercised together. */
import { parseArgs } from "node:util"
import { execPromise } from "./util/process"
import {
	runWorkspaceTaskPhases,
	selectWorkspaceTaskWorkspaces,
	type WorkspaceTaskSelection,
} from "./util/workspace-task.ts"
import { getWorkspaces } from "./util/workspaces.ts"

const usage = `
Usage: bun scripts/test.ts [options]

Options:
  -h, --help        Show this help message
  -a, --all         Run tests in all workspaces with a test script
  -d, --dirty       Only run tests in workspaces that are dirty or depend on dirty workspaces
  -e, --exclude     Exclude a workspace name, or part of, from being tested
  -i, --include     Include a workspace name, or part of, for testing
`

/** Run test and e2e scripts for the selected workspaces in dependency order. */
export async function testWorkspaces(p: WorkspaceTaskSelection = {}) {
	console.log("[TEST]:start")

	if (!p.all && !p.dirty && !p.include) {
		console.log("[TEST]: No packages selected. Use --all, --dirty, or --include.")
		return []
	}

	const workspaces = await getWorkspaces()
	const toTest = selectWorkspaceTaskWorkspaces(workspaces, p, {
		workspaceFilter: (workspace) =>
			Boolean(workspace.config.scripts?.test || workspace.config.scripts?.["test:e2e"]),
	})

	console.log(`[TEST]: Packages to test: ${toTest.map((workspace) => workspace.name).join(", ")}`)

	await runWorkspaceTaskPhases("TEST", toTest, async (workspace) => {
		if (workspace.config.scripts?.test) {
			console.log(`[TEST]: ${workspace.name}@${workspace.config.version} -> test`)
			console.log(await execPromise("npm run test", { cwd: workspace.path }))
		}
		if (workspace.config.scripts?.["test:e2e"]) {
			console.log(`[TEST]: ${workspace.name}@${workspace.config.version} -> test:e2e`)
			console.log(await execPromise("npm run test:e2e", { cwd: workspace.path }))
		}
	})

	console.log("TEST:end")
	return toTest
}

/** Parse CLI arguments and run the workspace test entrypoint. */
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

	await testWorkspaces(pa.values)
}

if (import.meta.main) main()
