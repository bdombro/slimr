import {fs, git, throwError} from './index.ts'

/** Get workspace meta for the current npm monorepo */
export async function getWorkspaces(
  props: {gitChanged?: string; packageJson?: Record<string, any>} = {}
): Promise<Record<string, Workspace>> {
  const gitChanged = props.gitChanged || (await git.getChanged())
  const packageJson =
    props.packageJson ||
    (await fs.readJsonSync('package.json')) ||
    throwError('No package.json found in root package.json')

  // Get the workspaces from the root package.json
  if (!packageJson.workspaces) throwError('No workspaces found in packageJson')

  const workspacePathsSet: Set<string> = new Set()
  for (const path of packageJson.workspaces) {
    if (path.includes('*')) {
      for await (const entry of fs.glob({include: path})) {
        workspacePathsSet.add(entry.relative.slice(0, -1))
      }
    } else {
      workspacePathsSet.add(path)
    }
  }

  const workspacePaths = Array.from(workspacePathsSet).toSorted()

  const workspaces: Record<string, Workspace> = {}
  for (const path of workspacePaths) {
    const config = await fs.readJsonSync(path + '/package.json')
    const workspace: Workspace = {
      config,
      dirty: gitChanged.includes(path),
      name: config.name,
      path,
      save: async () => fs.writeJsonSync(path + '/package.json', workspace.config),
      wsChildren: [],
      wsChildrenAll: [],
      wsParents: [],
      wsParentsAll: [],
    }
    workspaces[workspace.name] = workspace
  }

  // establish parent/child relationships between workspaces to build out wsChildrenAll and wsParentsAll
  for (const workspace of Object.values(workspaces)) {
    const deps = workspace.config.dependencies
      ? Object.keys(workspace.config.dependencies).filter(dep =>
          Object.keys(workspaces).includes(dep)
        )
      : []
    deps.forEach(dep => {
      workspace.wsParents.push(dep)
      workspaces[dep].wsChildren.push(workspace.name)
    })
  }

  // recursively build wsChildrenAll and wsParentsAll
  for (const workspace of Object.values(workspaces)) {
    const gatherParents = (ws: Workspace) => {
      ws.wsParents.forEach(parentName => {
        if (!workspace.wsParentsAll.includes(parentName)) {
          workspace.wsParentsAll.push(parentName)
          gatherParents(workspaces[parentName])
        }
      })
    }
    const gatherChildren = (ws: Workspace) => {
      ws.wsChildren.forEach(childName => {
        if (!workspace.wsChildrenAll.includes(childName)) {
          workspace.wsChildrenAll.push(childName)
          gatherChildren(workspaces[childName])
        }
      })
    }
    gatherParents(workspace)
    gatherChildren(workspace)
  }

  // now update dirty status based on children
  for (const workspace of Object.values(workspaces)) {
    if (!workspace.dirty) {
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

export interface Workspace {
  config: {version: string; private: boolean; dependencies: Record<string, string>}
  /** Is there changes to this workspace, or any of this workspaces children */
  dirty: boolean
  name: string
  path: string
  save: () => Promise<void>
  /** workspaces that depend on this workspace directly */
  wsChildren: string[]
  /** all workspaces that depend on this workspace, directly or indirectly */
  wsChildrenAll: string[]
  /** workspaces that this workspace depends on directly */
  wsParents: string[]
  /** all workspaces that this workspace depends on, directly or indirectly */
  wsParentsAll: string[]
}
