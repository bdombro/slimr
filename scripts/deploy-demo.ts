// deno-lint-ignore-file require-await no-explicit-any
import {fs, process} from './util/index.ts'

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
 * Bumps the version of any changed packages and their dependencies
 */
export async function deploy() {
  console.log('DEPLOY:start')

  // FIXME:
  // - Delete to demo branch
  // - Create to demo branch
  // - Move .git to packages/demo
  // - Change working directory to packages/demo
  // - Run `npm i @slimr/forms @slimr/markdown @slimr/mdi-paths @slimr/react @slimr/router @slimr/styled @slimr/swr @slimr/util`
  // - Run `npm run build`
  // - Run `git add -A`
  // - Run `git commit -m "chore: deploy demo"`
  // - Run `git push -f origin demo`
  // - Run `npm remove @slimr/forms @slimr/markdown @slimr/mdi-paths @slimr/react @slimr/router @slimr/styled @slimr/swr @slimr/util`
  // - Change working directory back to root
  // - Run `git checkout main`

  await process.spawn('git checkout -b demo')
  await fs.copyDirSync('.git', './packages/demo/.git')
  Deno.chdir('./packages/demo')
  await process.spawn(
    'npm i @slimr/forms @slimr/markdown @slimr/mdi-paths @slimr/react @slimr/router @slimr/styled @slimr/swr @slimr/util'
  )
  await process.spawn('npm run build')
  await process.spawn('git add -A')
  await process.spawn('git commit -m "chore: deploy demo"')
  await process.spawn('git push -f origin demo')
  await Deno.removeSync('.git')
  Deno.chdir('../..')
  await process.spawn('git checkout packages/demo')
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
