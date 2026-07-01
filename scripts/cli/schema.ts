/** ArgsBarg command tree for the slimr monorepo CLI. */
import { CliOptionKind, type CliProgram } from "argsbarg"
import pkg from "../../package.json" with { type: "json" }
import { buildWorkspaces } from "../tasks/build.ts"
import { buildLib } from "../tasks/build-lib.ts"
import { checkWorkspaces } from "../tasks/check.ts"
import { publishWorkspaces } from "../tasks/publish.ts"
import { testWorkspaces } from "../tasks/test.ts"
import {
	assertWorkspaceSelection,
	workspaceSelectionFromContext,
	workspaceSelectionOptions,
} from "./workspace-options.ts"

/** Root CLI schema: `bun scripts/cli.ts <command> [options]`. */
export const slimrCli = {
	key: "slimr",
	version: pkg.version,
	description: "Monorepo tooling for @slimr packages.",
	notes: "Workspace tasks support --all, --dirty, --include, and --exclude (repeatable).",
	commands: [
		{
			key: "build",
			description: "Build workspace packages in dependency order.",
			options: workspaceSelectionOptions,
			handler: async (ctx) => {
				const selection = workspaceSelectionFromContext(ctx)
				assertWorkspaceSelection(ctx, selection)
				await buildWorkspaces(selection)
			},
		},
		{
			key: "build-lib",
			description: "Build ESM/CJS artifacts for one package via tsc.",
			options: [
				{
					name: "pkg",
					description: "Package directory (default: current directory).",
					kind: CliOptionKind.String,
					shortName: "p",
				},
			],
			handler: async (ctx) => {
				const packageDir = ctx.stringOpt("pkg") ?? "."
				await buildLib(packageDir)
			},
		},
		{
			key: "check",
			description: "Run Biome and workspace typechecks.",
			options: [
				...workspaceSelectionOptions,
				{
					name: "fix",
					description: "Run Biome with --write to auto-fix issues.",
					kind: CliOptionKind.Presence,
					shortName: "f",
				},
			],
			handler: async (ctx) => {
				const selection = workspaceSelectionFromContext(ctx)
				assertWorkspaceSelection(ctx, selection)
				await checkWorkspaces({
					...selection,
					fix: ctx.hasFlag("fix") || process.argv.includes("--fix"),
				})
			},
		},
		{
			key: "test",
			description: "Run workspace checks, tests.",
			options: workspaceSelectionOptions,
			handler: async (ctx) => {
				const selection = workspaceSelectionFromContext(ctx)
				assertWorkspaceSelection(ctx, selection)
				await testWorkspaces(selection)
			},
		},
		{
			key: "publish",
			description: "Build, optionally bump, and publish workspace packages.",
			options: [
				...workspaceSelectionOptions,
				{
					name: "bump",
					description: "Bump package versions and update dependents before publish.",
					kind: CliOptionKind.Presence,
					shortName: "b",
				},
			],
			handler: async (ctx) => {
				const selection = workspaceSelectionFromContext(ctx)
				assertWorkspaceSelection(ctx, selection)
				await publishWorkspaces({
					...selection,
					bump: ctx.hasFlag("bump") || process.argv.includes("--bump"),
				})
			},
		},
	],
} satisfies CliProgram
