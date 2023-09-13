// deno-lint-ignore-file require-await no-explicit-any
import {npm, process} from './util/index.ts'

export const argv = import.meta.main && process.argParser().data

/************************************************************************
 * Globals
/************************************************************************/

const workspaces = await npm.getWorkspaces()

const usage = `
Usage: deno run --allow-read --allow-write scripts/bump-changed-workspaces.ts [options]

Options:
  -h, --help        Show this help message
  -e, --exclude     Exclude a workspace name, or part of, from being bumped
  -p, --publish     Publish the bumped packages to npm
  -r, --reset       Bump all workspaces and publish, thereby ensuring all versions are callibrated
`

/************************************************************************
 * Types
/************************************************************************/

/************************************************************************
 * Entry point(s)
/************************************************************************/

/**
 * Bumps the version of any changed packages and their dependencies
 */
export async function bumpChangedWorkspaces({
  exclude,
  publish,
  reset,
}: {
  /** Exclude a workspace name, or part of, from being bumped */
  exclude?: string[]
  /** Publish the bumped packages to npm */
  publish?: boolean
  /**
   * Bump all workspaces and publish, thereby ensuring all versions are callibrated
   *
   * Is useful if you commit a lot of changes and need to catch up
   */
  reset?: boolean
} = {}) {
  console.log('VERSION-BUMP:start')

  if (publish) {
    const user = (await process.spawn('npm whoami')).trim()
    if (!user) {
      console.log('Must be logged in to npm to publish')
      console.log('VERSION-BUMP:end')
      Deno.exit(1)
    }
  }

  for (const workspace of Object.values(workspaces)) {
    if (exclude && exclude.some(e => workspace.name.includes(e))) {
      workspace.skip = true
    }
  }
  for (const workspace of Object.values(workspaces)) {
    if (workspace.staged || reset) {
      await bumpVersion(workspace)
    }
  }

  if (publish) {
    await Promise.all(
      Object.values(workspaces)
        .filter(w => w.bumped)
        .map(async w => console.log(await process.spawn('npm publish', w.path)))
    )
  }

  const bumped = Object.values(workspaces)
    .filter(w => w.bumped)
    .map(w => ({name: w.name, path: w.path, version: w.config.version}))

  if (!bumped.length && import.meta.main) {
    console.log('No packages bumped')
    console.log('VERSION-BUMP:end')
    Deno.exit(1)
  }

  console.log('Bump Result: ' + bumped.map(w => `${w.name}@${w.version}`).join(', '))

  console.log('VERSION-BUMP:end')
  return bumped
}

/** The entrypoint if called directly (aka import.meta.main = true) */
async function main() {
  const _argv = structuredClone(argv)
  const exclude = process.pluckArg(argv, 'e', 'exclude')
  const publish = process.pluckArg(argv, 'p', 'publish', true)
  const reset = process.pluckArg(argv, 'r', 'reset', true)
  if (
    argv.commands.legnth ||
    Object.keys(_argv.shortSwitches).length ||
    Object.keys(_argv.longSwitches).length
  ) {
    console.log(usage)
    Deno.exit(1)
  }
  await bumpChangedWorkspaces({exclude, publish, reset})
}

if (import.meta.main && argv) {
  main()
}

/************************************************************************
 * Helper functions in alphabetical order
/************************************************************************/

/** Bumps the version of a workspace if not already bumped, and any dependencies recursively */
async function bumpVersion(
  workspace: npm.Workspace,
  dependency?: string,
  dependencyVersion?: string
) {
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
      await bumpVersion(workspace2, workspace.name, '^' + workspace.config.version)
    }
  }
}
