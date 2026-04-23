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
- [packages/react/](packages/react/) — React components/hooks/util; bundles several other @slimr libs
- [packages/router/](packages/router/) — novel React-web router with stack routing
- [packages/styled/](packages/styled/) — styled-components/Chakra-inspired css-in-js (depends on `@slimr/css`)
- [packages/swr/](packages/swr/) — stale-while-refresh data-fetching hook
- [packages/util/](packages/util/) — framework-agnostic JS polyfills
- [packages/demo/](packages/demo/) — demo app (not published)
- [scripts/](scripts/) — bun scripts: `build.ts`, `publish.ts`, `deploy-demo.ts`

Cross-package deps exist (e.g. `styled` → `css`, `react` re-exports others). When changing a lib, check and bump dependents.

## Tooling

- **Runtime/build:** Node + `bun` for scripts; Vite 4; TypeScript 5.
- **Lint/format:** Biome (`biome.json`). Run `npm run lint` / `npm run lint:fix`. Do not introduce ESLint/Prettier.
- **Test:** Vitest + Testing Library + jsdom. `npm test`.
- **Package manager:** npm workspaces.

## Common commands

- `npm start` — run the demo app
- `npm run build` — build all publishable packages (excludes demo)
- `npm run build:dirty` — build only changed packages
- `npm run lint` / `npm run lint:fix`
- `npm test` — vitest (watch); `npm test -- --run` for CI-style
- `npm run publish:dirty` — bump + publish changed packages (and their dependents)
- `npm run publish:demo` — deploy demo
- `npm run precommit` — install + build + lint + test (wired as a git pre-commit hook via `preinstall`)

## Conventions

- ESM only (`"type": "module"` at root).
- Keep packages **slim** — minimal deps, small surface area. That's the product thesis; don't add heavy dependencies without a strong reason.
- Each package owns its own build and `clean` script (invoked via `npm run -ws clean`).
- Each package has a [CHANGELOG.md](packages/*/CHANGELOG.md) that tracks changes in `[UNRELEASED]` until published.
- Public API changes require bumping the package version (use `publish:dirty`), and bumping dependents.
- File references in docs/comments: relative markdown links.

## When adding a feature

1. Implement in the owning package; update that package's README if behavior changes.
2. Add an entry to the `[UNRELEASED]` section of the package's CHANGELOG.md.
3. If it affects dependents (e.g. changing `css` affects `styled`), verify and bump them.
4. Update the root [README.md](README.md) if the package list or top-level story changes.
5. **Update this AGENTS.md** if: a package is added/removed/renamed, scripts change, tooling changes, or conventions shift.
6. Run `npm run precommit` before declaring done.
