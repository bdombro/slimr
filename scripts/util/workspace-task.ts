/** Shared workspace selection and phased execution helpers for repo scripts. */
import type { Workspace } from "./workspaces.ts"

/** Selection flags shared by build, test, and publish workspace tasks. */
export interface WorkspaceTaskSelection {
	all?: boolean
	dirty?: boolean
	exclude?: string[]
	include?: string[]
}

/** Optional filters that refine which workspaces the shared task runner selects. */
export interface WorkspaceTaskFilters {
	includeDependents?: boolean
	workspaceFilter?: (workspace: Workspace) => boolean
}

/** Select workspaces using the shared dirty/include/all rules and optional filters. */
export function selectWorkspaceTaskWorkspaces(
	workspaces: Record<string, Workspace>,
	selection: WorkspaceTaskSelection = {},
	filters: WorkspaceTaskFilters = {},
): Workspace[] {
	const selectedWorkspaces: Workspace[] = []
	const selectedNames = new Set<string>()
	const workspaceFilter = filters.workspaceFilter ?? (() => true)

	const addWorkspace = (workspace: Workspace, includeDependents: boolean) => {
		if (selectedNames.has(workspace.name)) {
			return
		}

		selectedNames.add(workspace.name)
		selectedWorkspaces.push(workspace)

		if (includeDependents) {
			for (const childName of workspace.wsChildrenAll) {
				const child = workspaces[childName]
				if (child && !selectedNames.has(child.name)) {
					selectedNames.add(child.name)
					selectedWorkspaces.push(child)
				}
			}
		}
	}

	for (const workspace of Object.values(workspaces)) {
		const isExcluded = selection.exclude?.some((exclude) => workspace.name.includes(exclude))
		const isIncluded = selection.include?.some((include) => workspace.name.includes(include))

		if (isExcluded || !workspaceFilter(workspace)) {
			continue
		}

		if (selection.all) {
			addWorkspace(workspace, filters.includeDependents ?? false)
		} else if (selection.dirty && workspace.dirty) {
			addWorkspace(workspace, filters.includeDependents ?? false)
		} else if (selection.include && isIncluded) {
			addWorkspace(workspace, filters.includeDependents ?? false)
		}
	}

	selectedWorkspaces.sort((left, right) => left.name.localeCompare(right.name))
	return selectedWorkspaces
}

/** Run a workspace task in dependency-safe phases. */
export async function runWorkspaceTaskPhases(
	label: string,
	workspaces: Workspace[],
	runWorkspace: (workspace: Workspace) => Promise<void>,
) {
	const remaining = [...workspaces]
	let phase = 0

	while (remaining.length) {
		const ready = remaining.filter((workspace) => {
			const hasUnbuiltParent = workspace.wsParentsAll.some((parentName) =>
				remaining.some((candidate) => candidate.name === parentName),
			)
			return !hasUnbuiltParent
		})

		if (!ready.length) {
			throw new Error(
				`[${label}]: Could not resolve a dependency phase order for: ${remaining.map((workspace) => workspace.name).join(", ")}`,
			)
		}

		console.log(`[${label}]: Phase ${++phase} at time ${new Date().toISOString()}...`)
		await Promise.all(
			ready.map(async (workspace) => {
				await runWorkspace(workspace)
				remaining.splice(remaining.indexOf(workspace), 1)
			}),
		)
	}

	return workspaces
}
