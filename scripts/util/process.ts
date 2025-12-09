import { exec } from "node:child_process"

/**
 * Executes a shell command and returns a promise that resolves with the output.
 */
export function execPromise(command: string, inPath?: string): Promise<string> {
	if (inPath) {
		command = `cd ${inPath} && ${command}`
	}
	return new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(stderr || error.message)
			} else {
				resolve(stdout)
			}
		})
	})
}
