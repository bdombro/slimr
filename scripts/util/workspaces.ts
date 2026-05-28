/** Build the monorepo workspace graph so scripts can resolve dirty packages and dependencies. */
import fs from "node:fs"
import { throwError } from "./errors.ts"
import { git } from "./git.ts"
import { json } from "./json.ts"

/** Get workspace metadata for the current monorepo. */
export async function getWorkspaces(
	props: { gitChanged?: string; packageJson?: Record<string, any> } = {},
): Promise<Record<string, Workspace>> {
	const gitChanged = props.gitChanged || (await git.getChanged())
	const packageJson = props.packageJson || (await json.readFile("package.json"))

	if (!packageJson.workspaces) throwError("No workspaces found in packageJson")

	const workspacePathsSet: Set<string> = new Set()
	for (let path of packageJson.workspaces) {
		if (path.endsWith("/*")) {
			path = path.slice(0, -2)
			fs.readdirSync(path).forEach((entryName) => {
				if (entryName.startsWith(".")) return
				workspacePathsSet.add(`${path}/${entryName}`)
			})
		} else {
			workspacePathsSet.add(path)
		}
	}

	const workspacePaths = Array.from(workspacePathsSet).toSorted()

	const workspaces: Record<string, Workspace> = {}
	for (const path of workspacePaths) {
		const config = json.readFile(`${path}/package.json`)
		const workspace: Workspace = {
			config,
			dirty: gitChanged.includes(path),
			name: config.name,
			path,
			save: async () => json.writeFile(`${path}/package.json`, workspace.config),
			wsChildren: [],
			wsChildrenAll: [],
			wsParents: [],
			wsParentsAll: [],
		}
		workspaces[workspace.name] = workspace
	}

	for (const workspace of Object.values(workspaces)) {
		const deps = workspace.config.dependencies
			? Object.keys(workspace.config.dependencies).filter((dep) =>
					Object.keys(workspaces).includes(dep),
				)
			: []
		deps.forEach((dep) => {
			workspace.wsParents.push(dep)
			workspaces[dep].wsChildren.push(workspace.name)
		})
	}

	for (const workspace of Object.values(workspaces)) {
		const gatherParents = (ws: Workspace) => {
			ws.wsParents.forEach((parentName) => {
				if (!workspace.wsParentsAll.includes(parentName)) {
					workspace.wsParentsAll.push(parentName)
					gatherParents(workspaces[parentName])
				}
			})
		}
		const gatherChildren = (ws: Workspace) => {
			ws.wsChildren.forEach((childName) => {
				if (!workspace.wsChildrenAll.includes(childName)) {
					workspace.wsChildrenAll.push(childName)
					gatherChildren(workspaces[childName])
				}
			})
		}
		gatherParents(workspace)
		gatherChildren(workspace)
	}

	for (const workspace of Object.values(workspaces)) {
		if (workspace.dirty) {
			console.debug(`[NPM]: Workspace ${workspace.name} is dirty due to direct changes`)
			for (const childName of workspace.wsChildrenAll) {
				if (workspaces[childName].dirty) {
					workspace.dirty = true
					break
				}
			}
		}
	}

	return workspaces
}

/** Workspace metadata plus dependency-closure bookkeeping for repo scripts. */
export interface Workspace {
	config: {
		version: string
		private: boolean
		dependencies: Record<string, string>
		scripts: Record<string, string>
	}
	dirty: boolean
	name: string
	path: string
	save: () => Promise<void>
	wsChildren: string[]
	wsChildrenAll: string[]
	wsParents: string[]
	wsParentsAll: string[]
}
