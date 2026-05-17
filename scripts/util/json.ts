import fs from "node:fs"

import { throwError } from "./errors.ts"

export const json = {
	readFile: (path: string) => {
		const data = fs.readFileSync(path, "utf-8")
		try {
			return JSON.parse(data)
		} catch (e) {
			throwError(`Failed to parse JSON from ${path}: ${(e as Error).message}`)
		}
	},
	writeFile: (path: string, data: any) => {
		const jsonString = JSON.stringify(data, null, 2)
		fs.writeFileSync(path, jsonString, "utf-8")
	},
}
