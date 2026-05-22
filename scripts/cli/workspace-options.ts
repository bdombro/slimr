/** Shared workspace selection flags and argv parsing for slimr CLI commands. */
import { type CliContext, type CliOption, CliOptionKind, cliErrWithHelp } from "argsbarg"
import type { WorkspaceTaskSelection } from "../util/workspace-task.ts"

/** Presence and string options used by build, check, test, and publish. */
export const workspaceSelectionOptions: CliOption[] = [
	{
		name: "all",
		description: "Select all workspaces (except excluded).",
		kind: CliOptionKind.Presence,
		shortName: "a",
	},
	{
		name: "dirty",
		description: "Select dirty workspaces and their dependents.",
		kind: CliOptionKind.Presence,
		shortName: "d",
	},
	{
		name: "exclude",
		description: "Exclude workspaces whose name contains this substring (repeatable).",
		kind: CliOptionKind.String,
		shortName: "e",
	},
	{
		name: "include",
		description: "Include workspaces whose name contains this substring (repeatable).",
		kind: CliOptionKind.String,
		shortName: "i",
	},
]

/** Scan argv for workspace flags so repeated --exclude/--include work like the old parser. */
export function workspaceSelectionFromArgv(argv = process.argv.slice(2)): WorkspaceTaskSelection {
	const selection: WorkspaceTaskSelection = {}

	for (let index = 0; index < argv.length; index++) {
		const token = argv[index]

		if (token === "--all" || token === "-a") {
			selection.all = true
			continue
		}
		if (token === "--dirty" || token === "-d") {
			selection.dirty = true
			continue
		}

		const pushList = (key: "exclude" | "include", value: string) => {
			selection[key] ??= []
			selection[key].push(value)
		}

		if (token === "--exclude" || token === "-e") {
			const value = argv[index + 1]
			if (value && !value.startsWith("-")) {
				pushList("exclude", argv[++index])
			}
			continue
		}
		if (token === "--include" || token === "-i") {
			const value = argv[index + 1]
			if (value && !value.startsWith("-")) {
				pushList("include", argv[++index])
			}
			continue
		}
		if (token.startsWith("--exclude=")) {
			pushList("exclude", token.slice("--exclude=".length))
			continue
		}
		if (token.startsWith("--include=")) {
			pushList("include", token.slice("--include=".length))
		}
	}

	return selection
}

/** Merge argsbarg-parsed flags with argv scanning for workspace selection. */
export function workspaceSelectionFromContext(ctx: CliContext): WorkspaceTaskSelection {
	const fromArgv = workspaceSelectionFromArgv()
	return {
		all: ctx.hasFlag("all") || fromArgv.all,
		dirty: ctx.hasFlag("dirty") || fromArgv.dirty,
		exclude: fromArgv.exclude?.length ? fromArgv.exclude : undefined,
		include: fromArgv.include?.length ? fromArgv.include : undefined,
	}
}

/** Exit with help when no workspace selection flags were provided. */
export function assertWorkspaceSelection(
	ctx: CliContext,
	selection: WorkspaceTaskSelection,
	message = "No packages selected. Use --all, --dirty, or --include.",
): void {
	if (!selection.all && !selection.dirty && !selection.include?.length) {
		cliErrWithHelp(ctx, message)
	}
}
