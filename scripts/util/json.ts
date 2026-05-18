/** JSON helpers used by repo scripts for simple file reads and writes. */
import fs from "node:fs"

import { throwError } from "./errors.ts"

export const json = {
	/** Read and parse a JSON file from disk. */
	readFile: (path: string) => {
		const data = fs.readFileSync(path, "utf-8")
		try {
			return JSON.parse(data)
		} catch (e) {
			throwError(`Failed to parse JSON from ${path}: ${(e as Error).message}`)
		}
	},
	/** Serialize JSON data and write it to disk with a trailing newline. */
	writeFile: (path: string, data: any) => {
		const jsonString = JSON.stringify(data, null, 2) + "\n"
		fs.writeFileSync(path, jsonString, "utf-8")
	},
}
