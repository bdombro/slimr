// deno-lint-ignore-file require-await no-explicit-any
// import { npm } from "./util/index.ts"

import { parseArgs } from "node:util"
import * as npm from "./util/npm"
import { execPromise } from "./util/process"

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
 * Bumps the version of any dirty packages and their dependencies
 */
export async function buildWorkspaces(
	p: {
		/** Build all workspaces (except excluded) */
		all?: boolean
		/** Only build workspaces that have dirty or depend on dirty workspaces */
		dirty?: boolean
		/** Exclude a workspace name, or part of, from being built */
		exclude?: string[]
		/** Include workspace names or parts */
		include?: string[]
	} = {},
) {
	console.log("[BUILD]:start")

	// If no flags, default to nothing
	if (!p.all && !p.dirty && !p.include) {
		console.log("[PUBLISH]: No packages selected for publish. Use --all, --dirty, or --include.")
		return []
	}

	const workspaces = await npm.getWorkspaces()

	// Determine which workspaces to publish
	let toBuild: npm.Workspace[] = []
	for (const workspace of Object.values(workspaces)) {
		const isExcluded = p.exclude?.some((e) => workspace.name.includes(e))
		const isIncluded = p.include?.some((i) => workspace.name.includes(i))

		if (isExcluded) {
			continue
		}

		if (workspace.name === "@slimr/mdi-paths") {
			console.warn(`[BUILD]: Skipping mdi-paths because it's heavy`)
			continue
		}

		// If --all, publish all
		if (p.all) {
			toBuild.push(workspace)
		}
		// If --dirty, publish dirty
		else if (p.dirty && workspace.dirty) {
			toBuild.push(workspace, ...workspace.wsChildrenAll.map((n) => workspaces[n]))
		}
		// If --include, publish included
		else if (p.include && isIncluded) {
			toBuild.push(workspace, ...workspace.wsChildrenAll.map((n) => workspaces[n]))
		}
	}

	toBuild = [...new Set(toBuild)] // deduplicate
	toBuild.sort((a, b) => a.name.localeCompare(b.name))

	console.log(`[BUILD]: Packages to build: ${toBuild.map((w) => w.name).join(", ")}`)

	const unbuilt = [...toBuild]

	let phase = 0
	while (unbuilt.length) {
		console.log(`[BUILD]: Phase ${++phase} at time ${new Date().toISOString()}...`)
		await Promise.all(
			unbuilt
				.filter((w) => {
					const hasUnbuiltParents = w.wsParentsAll.some((wsName) =>
						unbuilt.map((w2) => w2.name).includes(wsName),
					)
					return !hasUnbuiltParents
				})
				.map(async (w) => {
					console.log(`[BUILD]: ${w.name}@${w.config.version}...`)
					console.log(await execPromise("npm run build", w.path))
					unbuilt.splice(unbuilt.indexOf(w), 1)
				}),
		)
	}

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
