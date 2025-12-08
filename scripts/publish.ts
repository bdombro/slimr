// deno-lint-ignore-file require-await no-explicit-any
import {buildWorkspaces} from './build.ts'
import {npm, process} from './util/index.ts'

export const argv = import.meta.main && process.argParser().data

/************************************************************************
 * Globals
/************************************************************************/

const workspaces = await npm.getWorkspaces()

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
  } = {}
) {
  console.log('[PUBLISH]:start')

  const user = (await process.spawn('npm whoami')).trim()
  if (!user) {
    throw new Error('Must be logged in to npm to publish')
  }

  // If no flags, default to nothing
  if (!p.all && !p.dirty && !p.include) {
    console.log('[PUBLISH]: No packages selected for publish. Use --all, --dirty, or --include.')
    return []
  }

  // Determine which workspaces to publish
  let toPublish: npm.Workspace[] = []
  for (const workspace of Object.values(workspaces)) {
    const isExcluded = p.exclude?.some(e => workspace.name.includes(e))
    const isIncluded = p.include?.some(i => workspace.name.includes(i))

    if (isExcluded) {
      continue
    }

    if (workspace.name === '@slimr/mdi-paths') {
      console.warn(`[BUILD]: Skipping mdi-paths because it's heavy`)
      continue
    }

    // If --all, publish all
    if (p.all) {
      toPublish.push(workspace)
      continue
    }
    // If --dirty, publish dirty
    else if (p.dirty && workspace.dirty) {
      toPublish.push(workspace, ...workspace.wsChildrenAll.map(n => workspaces[n]))
      continue
    }
    // If --include, publish included
    else if (p.include && isIncluded) {
      toPublish.push(workspace, ...workspace.wsChildrenAll.map(n => workspaces[n]))
      continue
    }
  }

  toPublish = [...new Set(toPublish)] // deduplicate
  toPublish.sort((a, b) => a.name.localeCompare(b.name))

  console.log(`[PUBLISH]: Packages to publish: ${toPublish.map(w => w.name).join(', ')}`)

  console.log(`[PUBLISH]:build\n`)
  await buildWorkspaces({include: toPublish.map(w => w.name)})

  if (p.bump) {
    console.log(`[PUBLISH]:bump\n`)
    // Note: DONT parallelize this or your will get race conditions
    for (const workspace of toPublish) {
      await bumpVersion(workspace)
    }
  }
  
  console.log(`[PUBLISH]:publish\n`)
  for (const workspace of toPublish) {
    if (p.bump) await bumpVersion(workspace)
    console.log(`[PUBLISH]: Publishing ${workspace.name}@${workspace.config.version}...`)
    console.log(await process.spawn('npm publish --access public', workspace.path))
  }

  console.log('[PUBLISH]:end')
  return toPublish
}

/** The entrypoint if called directly (aka import.meta.main = true) */
async function main() {
  const _argv = structuredClone(argv)
  const all = process.pluckArg(_argv, 'a', 'all', true)
  const bump = process.pluckArg(_argv, 'b', 'bump', true)
  const dirty = process.pluckArg(_argv, 'd', 'dirty', true)
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
  await publishWorkspaces({all, bump, dirty, exclude, include})
}

if (import.meta.main && argv) {
  main()
}

/************************************************************************
 * Helper functions in alphabetical order
/************************************************************************/

/** Bumps the version of a workspace and update children to use the new version */
async function bumpVersion(workspace: npm.Workspace) {
  workspace.config.version = workspace.config.version
    .split('.')
    .map((v: string, i: number) => (i === 2 ? Number(v) + 1 : v))
    .join('.')
  await workspace.save()

  // update the children to the new version
  for (const childName of workspace.wsChildrenAll) {
    const child = workspaces[childName]
    if (child.config.dependencies && child.config.dependencies[workspace.name]) {
      child.config.dependencies[workspace.name] = `^${workspace.config.version}`
      await child.save()
    }
  }
}
