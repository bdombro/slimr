import fs from "node:fs"
import { parseArgs } from "node:util"
import { buildWorkspaces } from "./build.ts"
import * as npm from "./util/npm.ts"
import { execPromise } from "./util/process.ts"

/************************************************************************
 * Globals
/************************************************************************/

const usage = `
publish - publishes packages in an npm monorepo and respects inter-package dependencies

Usage: deno run --allow-read --allow-write scripts/publish.ts [options]

Options:
  -h, --help        Show this help message
  -a, --all         Publish all packages
  -b, --bump        Bump the version of packages before publishing
  -d, --dirty       Only publish dirty packages
  -e, --exclude     Exclude a workspace name, or part of, from being published
  -i, --include     Include a workspace name, or part of, for publishing
`

/************************************************************************
 * Types
/************************************************************************/

/************************************************************************
 * Entry point(s)
/************************************************************************/

/**
 * Publishes packages based on flags, optionally bumping versions
 */
export async function publishWorkspaces(
	p: {
		/** Publish all packages */
		all?: boolean
		/** Bump the version before publishing */
		bump?: boolean
		/** Only publish dirty packages */
		dirty?: boolean
		/** Exclude workspace names or parts */
		exclude?: string[]
		/** Include workspace names or parts */
		include?: string[]
	} = {},
) {
	console.log("[PUBLISH]:start")

	const user = (
		await execPromise("npm whoami").catch((e) => {
			throw Object.assign(e, { message: `[PUBLISH]: Error checking npm login` })
		})
	).trim()
	console.log(`[PUBLISH]: Logged in as ${user}`)

	// If no flags, default to nothing
	if (!p.all && !p.dirty && !p.include) {
		console.log("[PUBLISH]: No packages selected for publish. Use --all, --dirty, or --include.")
		return []
	}

	const workspaces = await npm.getWorkspaces()

	// Determine which workspaces to publish
	let toPublish: npm.Workspace[] = []
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
			toPublish.push(workspace)
		}
		// If --dirty, publish dirty
		else if (p.dirty && workspace.dirty) {
			toPublish.push(workspace, ...workspace.wsChildrenAll.map((n) => workspaces[n]))
		}
		// If --include, publish included
		else if (p.include && isIncluded) {
			toPublish.push(workspace, ...workspace.wsChildrenAll.map((n) => workspaces[n]))
		}
	}

	toPublish = [...new Set(toPublish)] // deduplicate
	toPublish.sort((a, b) => a.name.localeCompare(b.name))

	console.log(`[PUBLISH]: Packages to publish: ${toPublish.map((w) => w.name).join(", ")}`)

	console.log(`[PUBLISH]:build\n`)
	await buildWorkspaces({ include: toPublish.map((w) => w.name) })

	if (p.bump) {
		console.log(`[PUBLISH]:bump\n`)
		// Note: DONT parallelize this or your will get race conditions
		for (const workspace of toPublish) {
			await bumpVersion(workspaces, workspace)
		}
	}

	console.log(`[PUBLISH]:publish\n`)
	for (const workspace of toPublish) {
		console.log(`[PUBLISH]: Publishing ${workspace.name}@${workspace.config.version}...`)
		console.log(await execPromise("npm publish --access public", workspace.path))
	}

	console.log("[PUBLISH]:end")
	return toPublish
}

/** The entrypoint if called directly (aka import.meta.main = true) */
async function main() {
	const pa = parseArgs({
		options: {
			all: { type: "boolean", short: "a" },
			bump: { type: "boolean", short: "b" },
			dirty: { type: "boolean", short: "d" },
			exclude: { type: "string", short: "e", multiple: true },
			include: { type: "string", short: "i", multiple: true },
		},
	})
	if (!pa.values.all && !pa.values.dirty && !pa.values.include) {
		console.log(usage)
		return
	}
	await publishWorkspaces(pa.values)
}

if (import.meta.main) main()

/************************************************************************
 * Helper functions in alphabetical order
/************************************************************************/

/** Bumps the version of a workspace and update children to use the new version */
async function bumpVersion(workspaces: Record<string, npm.Workspace>, workspace: npm.Workspace) {
	const nextVersion = bumpPatchVersion(workspace.config.version)

	workspace.config.version = nextVersion
	await workspace.save()
	await insertChangelogVersion(workspace.path, nextVersion)

	// update the children to the new version
	for (const childName of workspace.wsChildrenAll) {
		const child = workspaces[childName]
		if (child.config.dependencies?.[workspace.name]) {
			child.config.dependencies[workspace.name] = `^${workspace.config.version}`
			await child.save()
		}
	}
}

/** Returns the next patch version for a semver string */
function bumpPatchVersion(version: string) {
	return version
		.split(".")
		.map((part: string, index: number) => (index === 2 ? Number(part) + 1 : part))
		.join(".")
}

/** Inserts the released version heading into the changelog below UNRELEASED */
async function insertChangelogVersion(workspacePath: string, version: string) {
	const changelogPath = `${workspacePath}/CHANGELOG.md`
	const changelog = fs.readFileSync(changelogPath, "utf-8")
	const unreleasedBlock = "## UNRELEASED\n\n"
	const versionBlock = `## ${version}\n\n`
	const expectedPrefix = `${unreleasedBlock}${versionBlock}`

	if (changelog.startsWith(expectedPrefix)) {
		return
	}

	const unreleasedIndex = changelog.indexOf(unreleasedBlock)
	if (unreleasedIndex === -1) {
		throw new Error(`[PUBLISH]: Could not find UNRELEASED heading in ${changelogPath}`)
	}

	const insertAt = unreleasedIndex + unreleasedBlock.length
	const updated = `${changelog.slice(0, insertAt)}${versionBlock}${changelog.slice(insertAt)}`
	fs.writeFileSync(changelogPath, updated, "utf-8")
}
