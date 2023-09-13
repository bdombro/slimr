// deno-lint-ignore-file require-await no-explicit-any
import {fs, process} from './util/index.ts'

process.spawn.debug = true

/************************************************************************
 * Globals
/************************************************************************/

export const argv = import.meta.main && process.argParser().data

const usage = `
Usage: deno run --allow-read --allow-write scripts/deploy-demo.ts [options]

Options:
  -h, --help        Show this help message
`

/************************************************************************
 * Types
/************************************************************************/

/************************************************************************
 * Entry point(s)
/************************************************************************/

/**
 * Updates the demo branch, which is just packages/demo, and pushes it to github.
 */
export async function deploy() {
  console.log('DEPLOY:start')

  await fs.rm('./packages/demo/.git').catch(() => {})
  await fs.cp('.git', './packages/demo/.git')
  Deno.chdir('./packages/demo')
  await process.spawn('git checkout -b demo')
  await fs.rm('package-lock.json').catch(() => {})
  await process.spawn('npm i')
  await process.spawn(
    'npm i @slimr/forms @slimr/markdown @slimr/mdi-paths @slimr/router @slimr/styled @slimr/swr @slimr/util'
  )
  await process.spawn('git add -A')
  await process.spawn(['git', 'commit', '--no-verify', '-m', 'chore: deploy demo'])
  await process.spawn('git push -f origin demo')
  await fs.rm('.git')
  await process.spawn(
    'npm remove @slimr/forms @slimr/markdown @slimr/mdi-paths @slimr/router @slimr/styled @slimr/swr @slimr/util'
  )
  Deno.chdir('../..')
  await process.spawn('npm i')

  console.log('DEPLOY:end')
}

/** The entrypoint if called directly (aka import.meta.main = true) */
async function main() {
  const _argv = structuredClone(argv)
  if (
    _argv.commands.legnth ||
    Object.keys(_argv.shortSwitches).length ||
    Object.keys(_argv.longSwitches).length
  ) {
    console.log(usage)
    Deno.exit(1)
  }
  await deploy()
}

if (import.meta.main && argv) {
  main()
}

/************************************************************************
 * Helper functions in alphabetical order
/************************************************************************/
