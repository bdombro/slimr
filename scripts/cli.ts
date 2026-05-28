#!/usr/bin/env bun
/** Single CLI entrypoint for slimr monorepo scripts (build, check, test, publish). */
import { cliRun } from "argsbarg"
import { slimrCli } from "./cli/schema.ts"

await cliRun(slimrCli)
