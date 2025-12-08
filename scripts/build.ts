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
  -c, --changed     Only build workspaces that have changed or depend on changed workspaces
  -e, --exclude     Exclude a workspace name, or part of, from being bumped
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
export async function buildWorkspaces(
  p: {
    /** Only build workspaces that have changed or depend on changed workspaces */
    changed?: boolean
    /** Exclude a workspace name, or part of, from being bumped */
    exclude?: string[]
  } = {}
) {
  console.log('[BUILD]:start')

  const toBuild: npm.Workspace[] = []
  for (const workspace of Object.values(workspaces)) {
    const isExcluded = p.exclude?.some(e => workspace.name.includes(e))
    if (!isExcluded && (!p.changed || workspace.dirty)) {
      toBuild.push(workspace)
    }
  }

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
  const changed = process.pluckArg(_argv, 'c', 'changed', true)
  const exclude = process.pluckArg(_argv, 'e', 'exclude')
  if (
    _argv.commands.length ||
    Object.keys(_argv.shortSwitches).length ||
    Object.keys(_argv.longSwitches).length
  ) {
    console.log(usage)
    Deno.exit(1)
  }
  await buildWorkspaces({changed, exclude})
}

if (import.meta.main && argv) {
  main()
}
