import * as mod from 'https://deno.land/std@0.201.0/fs/mod.ts'

import {throwError} from './errors.ts'

/** Has copy, copySync, move, moveSync, etc. */
export * from 'https://deno.land/std@0.201.0/fs/mod.ts'
export {globber as glob} from 'https://deno.land/x/globber@0.1.0/mod.ts'

export const copyDir = mod.copy
export const copyDirSync = mod.copySync

export const copyFile = Deno.copyFile
export const copyFileSync = Deno.copyFileSync

export const readDir = Deno.readDirSync
export const readDirSync = Deno.readDirSync

export async function readFileSync(path: string) {
  return Deno.readTextFile(path).catch(() => throwError(`${path} read failed`))
}

/** Read a json file from the fs */
export async function readJsonSync(from: string) {
  return JSON.parse(await readFileSync(from))
}

export async function writeFileSync(path: string, content: string) {
  return Deno.writeTextFile(path, content)
}

/** Write a json file */
export async function writeJsonSync(to: string, json: any) {
  return writeFileSync(to, JSON.stringify(json, null, 2) + '\n')
}
