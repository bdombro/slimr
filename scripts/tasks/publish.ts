/** Publish workspace packages in dependency order so releases stay aligned with the workspace graph. */
import fs from "node:fs"
import { execPromise } from "../util/process.ts"
import {
	runWorkspaceTaskPhases,
	selectWorkspaceTaskWorkspaces,
	type WorkspaceTaskSelection,
} from "../util/workspace-task.ts"
import { getWorkspaces, type Workspace } from "../util/workspaces.ts"

/** Publish options beyond workspace selection. */
export interface PublishTaskSelection extends WorkspaceTaskSelection {
	bump?: boolean
}

/** Publishes packages based on flags, optionally bumping versions. */
export async function publishWorkspaces(selection: PublishTaskSelection = {}) {
	console.log("[PUBLISH]:start")

	const user = (
		await execPromise("npm whoami").catch((error) => {
			throw Object.assign(error, { message: `[PUBLISH]: Error checking npm login` })
		})
	).trim()
	console.log(`[PUBLISH]: Logged in as ${user}`)

	const workspaces = await getWorkspaces()
	const toPublish = selectWorkspaceTaskWorkspaces(workspaces, selection, {
		includeDependents: true,
		workspaceFilter: (workspace) => workspace.name !== "@slimr/mdi-paths",
	})

	console.log(
		`[PUBLISH]: Packages to publish: ${toPublish.map((workspace) => workspace.name).join(", ")}`,
	)

	console.log("[PUBLISH]:build\n")
	await runWorkspaceTaskPhases("BUILD", toPublish, async (workspace) => {
		console.log(`[BUILD]: ${workspace.name}@${workspace.config.version}...`)
		console.log(await execPromise("npm run build", { cwd: workspace.path }))
	})

	if (selection.bump) {
		console.log("[PUBLISH]:bump\n")
		for (const workspace of toPublish) {
			await bumpVersion(workspaces, workspace)
		}
	}

	console.log("[PUBLISH]:publish\n")
	await runWorkspaceTaskPhases("PUBLISH", toPublish, async (workspace) => {
		console.log(`[PUBLISH]: Publishing ${workspace.name}@${workspace.config.version}...`)
		console.log(await execPromise("npm publish --access public", { cwd: workspace.path }))
	})

	console.log("[PUBLISH]:end")
	return toPublish
}

/** Bumps the version of a workspace and update children to use the new version. */
async function bumpVersion(workspaces: Record<string, Workspace>, workspace: Workspace) {
	const nextVersion = bumpPatchVersion(workspace.config.version)

	workspace.config.version = nextVersion
	await workspace.save()
	await insertChangelogVersion(workspace.path, nextVersion)

	for (const childName of workspace.wsChildrenAll) {
		const child = workspaces[childName]
		if (child.config.dependencies?.[workspace.name]) {
			child.config.dependencies[workspace.name] = `^${workspace.config.version}`
			await child.save()
		}
	}
}

/** Returns the next patch version for a semver string. */
function bumpPatchVersion(version: string) {
	return version
		.split(".")
		.map((part: string, index: number) => (index === 2 ? Number(part) + 1 : part))
		.join(".")
}

/** Inserts the released version heading into the changelog below UNRELEASED. */
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
