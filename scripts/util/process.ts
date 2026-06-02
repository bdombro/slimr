/** Run shell commands with a structured cwd option for repo scripts. */
import { exec } from "node:child_process"

/**
 * Executes a shell command and returns a promise that resolves with the output.
 */
export function execPromise(command: string, options: { cwd?: string } = {}): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(command, { cwd: options.cwd }, (error, stdout, stderr) => {
			if (error) {
				console.error(stderr || error.message)
				reject(stderr || error.message)
			} else {
				resolve(stdout)
			}
		})
	})
}
