# Run this using `just` --> (https://github.com/casey/just)

# Show available tasks
_:
    @just --list

# Build all publishable packages (excludes demo); extra args pass through to scripts/build.ts
build *ARGS='':
    bun scripts/build.ts --all --exclude demo {{ARGS}}

# Build only packages with uncommitted changes; extra args pass through to scripts/build.ts
build-dirty *ARGS='':
    bun scripts/build.ts --dirty --exclude demo {{ARGS}}

# Check code style and TypeScript correctness; extra args pass through to scripts/check.ts
check *ARGS='':
    bun scripts/check.ts --all {{ARGS}}

# Check only packages with uncommitted changes; extra args pass through to scripts/check.ts
check-dirty *ARGS='':
    bun scripts/check.ts --dirty --exclude demo {{ARGS}}

# Remove build artifacts from all workspaces
clean:
    npm run -ws clean

alias fmt := format
# Format code with Biome
format:
    npx biome check --write

# Install dependencies and set up git hooks (run once after cloning)
install:
    npm install
    echo 'just precommit' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# Precommit check: build dirty workspaces, lint, and run dirty tests
precommit:
    bun scripts/precommit.ts

# Bump versions and publish all packages to npm (excludes demo); extra args pass through
publish-all *ARGS='':
    bun scripts/publish.ts --bump --all --exclude demo {{ARGS}}

# Bump and publish only changed packages; extra args pass through to scripts/publish.ts
publish-dirty *ARGS='':
    bun scripts/publish.ts --bump --dirty --exclude demo {{ARGS}}

# Deploy the demo app
publish-demo:
    bun scripts/deploy-demo.ts

# Start the demo app dev server
start:
    npm run -w @slimr/demo start

# Run tests once (CI-style, no watch); extra args pass through to vitest
test *ARGS='':
    ./node_modules/.bin/vitest --run {{ARGS}}
    ./node_modules/.bin/playwright test --config packages/dbsync/playwright.config.ts

# Run tests only for dirty workspaces; extra args pass through to scripts/test.ts
test-dirty *ARGS='':
    bun scripts/test.ts --dirty --exclude demo {{ARGS}}

# Check for newer versions of dependencies
update:
    npx npm-check-updates

# Run tests in watch mode; extra args pass through to vitest
watch *ARGS='':
    ./node_modules/.bin/vitest {{ARGS}}
