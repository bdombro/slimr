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

  const workspacePaths: Set<string> = new Set()
  for (const path of packageJson.workspaces) {
    if (path.includes('*')) {
      for await (const entry of fs.glob({include: path})) {
        workspacePaths.add(entry.relative.slice(0, -1))
      }
    } else {
      workspacePaths.add(path)
    }
  }

  const workspaces: Record<string, Workspace> = {}
  for (const path of workspacePaths) {
    const config = await fs.readJsonSync(path + '/package.json')
    const workspace: Workspace = {
      bumped: false,
      staged: gitChanged.includes(path),
      config,
      name: config.name,
      path,
      save: async () => fs.writeJsonSync(path + '/package.json', workspace.config),
      skip: false,
    }
    workspaces[workspace.name] = workspace
  }

  return workspaces
}

export interface Workspace {
  bumped: boolean
  staged: boolean
  config: {version: string; private: boolean; dependencies: Record<string, string>}
  name: string
  path: string
  save: () => Promise<void>
  skip: boolean
}
