// deno-lint-ignore-file require-await no-explicit-any
import {parser as argParser} from 'https://deno.land/x/args_command_parser@v1.2.4/mod.js'
import {globber} from 'https://deno.land/x/globber@0.1.0/mod.ts'

/************************************************************************
 * Globals
/************************************************************************/

const argv = import.meta.main && argParser().data
const gitStaged = await spawn('git diff --name-only --cached')
const rootConfig = await readJson('package.json')
const workspaces: Record<string, Workspace> = await getWorkspaces()

const usage = `
Usage: deno run --allow-read --allow-write scripts/version-bump.ts [options]

Options:
  -e, --exclude     Exclude a workspace name, or part of, from being bumped
  -n, --npm         Path to npm executable if publishing (default: npm)
  -p, --publish     Publish the bumped packages to npm
  -s, --skip-stage  Skip staging the bumped packages' package.json files
  -h, --help        Show this help message
`

/************************************************************************
 * Types
/************************************************************************/

interface Workspace {
  bumped: boolean
  staged: boolean
  config: {version: string; dependencies: Record<string, string>}
  name: string
  path: string
  save: () => Promise<void>
  skip: boolean
}

/************************************************************************
 * Entry point(s)
/************************************************************************/

/**
 * Bumps the version of any changed packages and their dependencies
 */
export async function bumpStagedWorkspaces({exclude}: {exclude?: string[]} = {}) {
  console.log('VERSION-BUMP:start')

  for (const workspace of Object.values(workspaces)) {
    if (exclude && exclude.some(e => workspace.name.includes(e))) {
      workspace.skip = true
    }
  }
  for (const workspace of Object.values(workspaces)) {
    if (workspace.staged) {
      await bumpVersion(workspace)
    }
  }

  const bumped = Object.values(workspaces)
    .filter(w => w.bumped)
    .map(w => ({name: w.name, path: w.path, version: w.config.version}))

  if (!bumped.length && import.meta.main) {
    console.log('No packages bumped')
    console.log('VERSION-BUMP:end')
    Deno.exit(1)
  }

  console.log('VERSION-BUMP:end')
  return bumped
}

/** The entrypoint if called directly (aka import.meta.main = true) */
async function main() {
  const pluckArg = (short: string, long: string, boolean?: boolean): string[] => {
    if (short in argv.shortSwitches || long in argv.longSwitches) {
      const values = [...(argv.shortSwitches?.[short] ?? []), ...(argv.longSwitches?.[long] ?? [])]
      delete argv.shortSwitches?.[short]
      delete argv.longSwitches?.[long]
      if (boolean) return ['true']
      return values
    }
    return []
  }
  const exclude = pluckArg('e', 'exclude')
  if (
    argv.commands.legnth ||
    Object.keys(argv.shortSwitches).length ||
    Object.keys(argv.longSwitches).length
  ) {
    console.log(usage)
    Deno.exit(1)
  }
  await bumpStagedWorkspaces({exclude})
}

if (import.meta.main && argv) {
  main()
}

/************************************************************************
 * Helper functions in alphabetical order
/************************************************************************/

/** Bumps the version of a workspace if not already bumped, and any dependencies recursively */
async function bumpVersion(workspace: Workspace, dependency?: string, dependencyVersion?: string) {
  if (workspace.skip) return

  if (dependency && dependencyVersion) {
    workspace.config.dependencies[dependency] = dependencyVersion
    console.log(`Bumping ${workspace.name}:${dependency} to ${dependencyVersion}`)
    await workspace.save()
  }

  if (workspace.bumped) {
    console.log(`Already bumped ${workspace.name}`)
    return
  }
  workspace.bumped = true

  workspace.config.version = workspace.config.version
    .split('.')
    .map((v: string, i: number) => (i === 2 ? Number(v) + 1 : v))
    .join('.')
  console.log(`Bumping ${workspace.name} to ${workspace.config.version}`)
  await workspace.save()

  // Find other packages that depend on css and bump their versions and the css dependency
  for (const workspace2 of Object.values(workspaces)) {
    if (workspace2 === workspace) continue
    if (workspace2.config.dependencies?.[workspace.name]) {
      await bumpVersion(workspace2, workspace.name, workspace.config.version)
    }
  }
}

/** Get workspaces from workspacePaths */
async function getWorkspaces() {
  // Get the workspaces from the root package.json
  if (!rootConfig.workspaces) throwError('No workspaces found in root package.json')
  const workspacePaths: Set<string> = new Set()
  for (const path of rootConfig.workspaces) {
    if (path.includes('*')) {
      for await (const entry of globber({include: path})) {
        workspacePaths.add(entry.relative.slice(0, -1))
      }
    } else {
      workspacePaths.add(path)
    }
  }

  const workspaces: Record<string, Workspace> = {}
  for (const path of workspacePaths) {
    const config = await readJson(path + '/package.json')
    const workspace: Workspace = {
      bumped: false,
      staged: gitStaged.includes(path),
      config,
      name: config.name,
      path,
      save: async () => writeJson(path + '/package.json', workspace.config),
      skip: false,
    }
    workspaces[workspace.name] = workspace
  }

  return workspaces
}

/** Read a file from the fs */
async function read(path: string) {
  return Deno.readTextFile(path).catch(() => throwError(`${path} read failed`))
}

/** Read a package.json file from the fs */
async function readJson(from: string) {
  return JSON.parse(await read(from))
}

/** Spawns a process and returns the output */
async function spawn(cmd: string, cwd?: string) {
  const p = Deno.run({
    cmd: cmd.split(' '),
    cwd,
    stdout: 'piped',
  })
  const out = new TextDecoder().decode(await p.output())
  return out
}

/** Throw an error */
function throwError(e: Error | string): never {
  throw e
}

/** Write to a file */
export async function write(path: string, content: string) {
  return Deno.writeTextFile(path, content)
}

/** Write a package.json file */
export async function writeJson(to: string, json: any) {
  return write(to, JSON.stringify(json, null, 2) + '\n')
}
