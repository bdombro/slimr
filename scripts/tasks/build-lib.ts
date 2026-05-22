/**
 * Build ESM and CommonJS library artifacts for a single package via `tsc`, then normalize `.cjs` output.
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
	await $`tsc -d -m node16 --moduleResolution node16 --outDir cjs --noEmit false`.cwd(packageRoot)
	await normalizeCommonJsExtensions(path.join(packageRoot, "cjs"))
}

/** Rename `.js` outputs to `.cjs` and fix maps and require paths for `type=module` packages. */
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

/** Recursively list all files under a directory. */
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
