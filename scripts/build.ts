// deno-lint-ignore-file require-await no-explicit-any
import {npm, process} from './util/index.ts'

export const argv = import.meta.main && process.argParser().data

/************************************************************************
 * Globals
/************************************************************************/

const workspaces = await npm.getWorkspaces()

const usage = `
Usage: deno run --allow-read --allow-write scripts/build-workspaces.ts [options]

Options:
  -h, --help        Show this help message
  -a, --all         Build all workspaces (except excluded)
  -c, --dirty     Only build workspaces that have dirty or depend on dirty workspaces
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
  } = {}
) {
  console.log('[BUILD]:start')

  // If no flags, default to nothing
  if (!p.all && !p.dirty && !p.include) {
    console.log('[PUBLISH]: No packages selected for publish. Use --all, --dirty, or --include.')
    return []
  }

  // Determine which workspaces to publish
  let toBuild: npm.Workspace[] = []
  for (const workspace of Object.values(workspaces)) {
    const isExcluded = p.exclude?.some(e => workspace.name.includes(e))
    const isIncluded = p.include?.some(i => workspace.name.includes(i))

    if (isExcluded) {
      continue
    }

    // If --all, publish all
    if (p.all) {
      toBuild.push(workspace)
      continue
    }
    // If --dirty, publish dirty
    else if (p.dirty && workspace.dirty) {
      toBuild.push(workspace, ...workspace.wsChildrenAll.map(n => workspaces[n]))
      continue
    }
    // If --include, publish included
    else if (p.include && isIncluded) {
      toBuild.push(workspace, ...workspace.wsChildrenAll.map(n => workspaces[n]))
      continue
    }
  }

  toBuild = [...new Set(toBuild)] // deduplicate
  toBuild.sort((a, b) => a.name.localeCompare(b.name))

  console.log(`[BUILD]: Packages to build: ${toBuild.map(w => w.name).join(', ')}`)

  const unbuilt = [...toBuild]

  let phase = 0
  while (unbuilt.length) {
    console.log(`[BUILD]: Phase ${++phase} at time ${new Date().toISOString()}...`)
    await Promise.all(
      unbuilt
        .filter(w => {
          const hasUnbuiltParents = w.wsParentsAll.some(wsName =>
            unbuilt.map(w2 => w2.name).includes(wsName)
          )
          return !hasUnbuiltParents
        })
        .map(async w => {
          console.log(`[BUILD]: ${w.name}@${w.config.version}...`)
          console.log(await process.spawn('npm run build', w.path))
          unbuilt.splice(unbuilt.indexOf(w), 1)
        })
    )
  }

  console.log('BUILD:end')
  return toBuild
}

/** The entrypoint if called directly (aka import.meta.main = true) */
async function main() {
  const _argv = structuredClone(argv)
  const all = process.pluckArg(_argv, 'a', 'all', true)
  const dirty = process.pluckArg(_argv, 'c', 'dirty', true)
  const exclude = process.pluckArg(_argv, 'e', 'exclude')
  const include = process.pluckArg(_argv, 'i', 'include')
  if (
    _argv.commands.length ||
    Object.keys(_argv.shortSwitches).length ||
    Object.keys(_argv.longSwitches).length
  ) {
    console.log(usage)
    Deno.exit(1)
  }
  await buildWorkspaces({all, dirty, exclude, include})
}

if (import.meta.main && argv) {
  main()
}
