export {parser as argParser} from 'https://deno.land/x/args_command_parser@v1.2.4/mod.js'

type Argv = any

/** Find an arg and remove it from argv */
export function pluckArg(argv: Argv, short: string, long: string): string[]
export function pluckArg(argv: Argv, short: string, long: string, boolean: boolean): boolean
// eslint-disable-next-line require-jsdoc
export function pluckArg(argv: Argv, short: string, long: string, boolean?: boolean): any {
  if (short in argv.shortSwitches || long in argv.longSwitches) {
    const values = [...(argv.shortSwitches?.[short] ?? []), ...(argv.longSwitches?.[long] ?? [])]
    delete argv.shortSwitches?.[short]
    delete argv.longSwitches?.[long]
    return boolean ? true : values
  }
  return boolean ? false : []
}

/** Spawns a process and returns the output */
export async function spawn(cmd: string, cwd?: string) {
  const p = Deno.run({
    cmd: cmd.split(' '),
    cwd,
    // stderr: 'piped',
    stdout: 'piped',
  })
  const out = new TextDecoder().decode(await p.output())
  return out
}
