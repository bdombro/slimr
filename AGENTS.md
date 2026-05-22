# AGENTS.md

Guidance for AI agents working in this repo.

> **Keep this file in sync.** Whenever features, packages, scripts, tooling, or conventions change, update AGENTS.md in the same change. Treat drift as a bug.

## Project

`@slimr` — a monorepo of slim, mostly-independent React libraries published to npm under the `@slimr/*` scope. Private root package; individual packages are published.

## Workspace layout

- [packages/css/](packages/css/) — framework-agnostic css-in-js (Emotion-inspired)
- [packages/forms/](packages/forms/) — enhanced HTML form (auto-disable, auto-reset, error handling, context)
- [packages/markdown/](packages/markdown/) — slim markdown-to-HTML parser + component
- [packages/mdi-paths/](packages/mdi-paths/) — Material Design icon paths, code-split
- [packages/react/](packages/react/) — convenience meta-package; re-exports `@slimr/react-util` and several other @slimr libs
- [packages/observable/](packages/observable/) — framework-agnostic pub/sub `Observable`; React entry at `@slimr/observable/react`
- [packages/react-util/](packages/react-util/) — React hooks and utilities (mergeRefs, useColorScheme, useReRender, useSet, and more)
- [packages/router/](packages/router/) — novel React-web router with stack routing
- [packages/styled/](packages/styled/) — styled-components/Chakra-inspired css-in-js (depends on `@slimr/css`)
- [packages/swr/](packages/swr/) — stale-while-refresh data-fetching hook
- [packages/util/](packages/util/) — framework-agnostic JS polyfills
- [packages/demo/](packages/demo/) — demo app (not published)
- [scripts/](scripts/) — `cli.ts` (argsbarg CLI: `build`, `build-lib`, `check`, `test`, `publish`, `precommit`), task modules in `tasks/`, and shared utilities in `util/` (`workspaces.ts`, `workspace-task.ts`, `process.ts`)

Cross-package deps exist (e.g. `styled` → `css`, `react` re-exports others). When changing a lib, check and bump dependents.

## Tooling

- **Runtime/build:** Node is the baseline runtime. Repo scripts run via `bun scripts/cli.ts <command>` (argsbarg); package work should follow each package's `package.json`. Vite 4; TypeScript 5. Published CommonJS artifacts use `.cjs` extensions; library packages build via `bun scripts/cli.ts build-lib --pkg .`. Workspace graph and task selection live in `scripts/util/workspaces.ts` and `scripts/util/workspace-task.ts`; `scripts/util/process.ts` uses structured `{ cwd }` options.
- **Lint/format:** Biome (`biome.json`). Run `npm run lint` / `npm run lint:fix`. Do not introduce ESLint/Prettier.
- **Test:** Vitest + Testing Library + jsdom. `npm test`.
- **Package manager:** npm workspaces.

When working inside a package, inspect that package's `package.json` first and use its scripts and documented workflow. Do not assume the root repo tooling applies unchanged to all packages.

## Common commands

- `just start` — run the demo app
- `just build` — build all publishable packages (excludes demo)
- `just build-dirty` — build only changed packages
- `just check` / `just check-dirty` — Biome + workspace typechecks via `scripts/cli.ts check`. `just build`, `test-dirty`, `publish-*`, etc. call the same CLI; extra args forward to the command (e.g. `just check --fix`, `just build-dirty --include dbsync`). Run `bun scripts/cli.ts --help` for subcommands and flags.
- `just lint` / `just lint-fix`
- `just test` — vitest + Playwright for the repo's tests
- `just publish-dirty` — bump + publish changed packages (and their dependents), and insert a new released-version heading in each published package's CHANGELOG.md
- `just publish-demo` — deploy demo
- `just precommit` — build dirty workspaces, lint, and test dirty workspaces (wired as a git pre-commit hook via `preinstall`)

## Conventions

- ESM only (`"type": "module"` at root).
- Keep packages **slim** — minimal deps, small surface area. That's the product thesis; don't add heavy dependencies without a strong reason.
- Each package owns its own build, `clean`, and `typecheck` scripts (`tsc -b` on composite `tsconfig.json`; `@slimr/dbsync` uses `tsc -b tsconfig.test.json`). `just check` runs workspace typechecks in dependency order plus `tsc -b tsconfig.node.json` for the repo Vite config when checking all packages (`npm run -ws clean` for clean).
- Each package has a [CHANGELOG.md](packages/*/CHANGELOG.md) that tracks changes in `UNRELEASED` until published.
- Public API changes require bumping the package version (use `publish:dirty`), and bumping dependents.
- File references in docs/comments: relative markdown links.

## When adding a feature

1. Implement in the owning package; update that package's README if behavior changes.
2. Add an entry to the `UNRELEASED` section of the package's CHANGELOG.md.
3. If it affects dependents (e.g. changing `css` affects `styled`), verify and bump them.
4. Update the root [README.md](README.md) if the package list or top-level story changes.
5. **Update this AGENTS.md** if: a package is added/removed/renamed, scripts change, tooling changes, or conventions shift.
6. Run `npm run precommit` before declaring done.
