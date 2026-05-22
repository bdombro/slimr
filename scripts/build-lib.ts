/**
 * A simple npm library package builder using `tsc`
 *
 * `tsc` gets you most of the way there, but needs help producing a standard compliant npm package. Specifically,
 *
 * 1. `tsc` won't produce both ESM and CommonJS outputs in the same compilation, so we have to run it twice with different configs
 * 2. `tsc` doesn't output .cjs extensions for CommonJS modules, which causes issues for ESM-first consumers like Vite that expect
 *     .cjs for CJS modules when package.json::type=module
 *
 */

import fs from "node:fs"
import path from "node:path"
import { $ } from "bun"

/** Build the ESM and CommonJS artifacts for a package and normalize CJS output. */
export async function buildLib(packageDir = ".") {
	const packageRoot = path.resolve(packageDir)
	fs.rmSync(path.join(packageRoot, "esm"), { force: true, recursive: true })
	fs.rmSync(path.join(packageRoot, "cjs"), { force: true, recursive: true })
	await $`tsc -d --outDir esm --noEmit false`.cwd(packageRoot)
	// Node16 resolution honors package.json "exports" (e.g. @slimr/observable/react types).
	await $`tsc -d -m node16 --moduleResolution node16 --outDir cjs --noEmit false`.cwd(packageRoot)
	await normalizeCommonJsExtensions(path.join(packageRoot, "cjs"))
}

/**
 * tsc produces .js files, but consumers expect .cjs extension for the cjs dir when package.json::type=module
 * This fnc renames the .js files to .cjs and updates the source maps and require statements accordingly
 */
async function normalizeCommonJsExtensions(rootDir: string) {
	if (!fs.existsSync(rootDir)) {
		return
	}

	const allFiles = listFiles(rootDir)
	const jsFiles = allFiles.filter((filePath) => filePath.endsWith(".js"))
	const mapFiles = allFiles.filter((filePath) => filePath.endsWith(".js.map"))

	for (const filePath of [...jsFiles, ...mapFiles].sort(
		(left, right) => right.length - left.length,
	)) {
		const nextPath = filePath.replace(/\.js(\.map)?$/, ".cjs$1")
		fs.renameSync(filePath, nextPath)
	}

	for (const filePath of listFiles(rootDir).filter((entry) => entry.endsWith(".cjs"))) {
		const contents = await Bun.file(filePath).text()
		const nextContents = contents
			.replace(/(require\(["'][^"']+)\.js(["']\))/g, "$1.cjs$2")
			.replace(/(sourceMappingURL=[^\n]+)\.js\.map/g, "$1.cjs.map")

		if (nextContents !== contents) {
			await Bun.write(filePath, nextContents)
		}
	}

	for (const filePath of listFiles(rootDir).filter((entry) => entry.endsWith(".cjs.map"))) {
		const map = JSON.parse(await Bun.file(filePath).text()) as { file?: string }
		if (typeof map.file === "string") {
			map.file = map.file.replace(/\.js$/, ".cjs")
			await Bun.write(filePath, `${JSON.stringify(map)}\n`)
		}
	}
}

/**
 * Recursively lists all files in a directory and its subdirectories
 */
function listFiles(rootDir: string): string[] {
	const entries = fs.readdirSync(rootDir, { withFileTypes: true })
	const files: string[] = []

	for (const entry of entries) {
		const entryPath = path.join(rootDir, entry.name)
		if (entry.isDirectory()) {
			files.push(...listFiles(entryPath))
		} else if (entry.isFile()) {
			files.push(entryPath)
		}
	}

	return files
}

/** The entrypoint if called directly (aka import.meta.main = true) */
async function main() {
	const packageDirArgIndex = process.argv.indexOf("--pkg")
	const packageDir = packageDirArgIndex >= 0 ? process.argv[packageDirArgIndex + 1] : "."
	await buildLib(packageDir)
}

if (import.meta.main) main()
