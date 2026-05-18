# Run this using `just` --> (https://github.com/casey/just)

# Show available tasks
_:
    @just --list

# Build all publishable packages (excludes demo)
build:
    bun scripts/build.ts --all --exclude demo

# Build only packages with uncommitted changes (faster than full build)
build-dirty:
    bun scripts/build.ts --dirty --exclude demo

# Remove build artifacts from all workspaces
clean:
    npm run -ws clean

# Install dependencies and set up git hooks (run once after cloning)
install:
    npm install
    echo 'just precommit' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# Check code style and correctness with Biome
lint:
    npx biome check


alias fmt := lint-fix
# Auto-fix Biome lint/format violations in place
lint-fix:
    npx biome check --write

# Re-run lint on every file save for rapid feedback during development
lint-watch:
    npx nodemon -e js,jsx,ts,tsx,css,pcss --exec 'just lint'

# Precommit check: build dirty workspaces, lint, and run dirty tests
precommit:
    bun scripts/precommit.ts

# Bump versions and publish all packages to npm (excludes demo)
publish-all:
    bun scripts/publish.ts --bump --all --exclude demo

# Bump and publish only changed packages and their dependents
publish-dirty:
    bun scripts/publish.ts --bump --dirty --exclude demo

# Deploy the demo app
publish-demo:
    bun scripts/deploy-demo.ts

# Start the demo app dev server
start:
    npm run -w @slimr/demo start

# Run tests once (CI-style, no watch)
test:
    ./node_modules/.bin/vitest --run
    ./node_modules/.bin/playwright test --config packages/dbsync/playwright.config.ts

# Run tests only for dirty workspaces with test scripts
test-dirty:
    bun scripts/test.ts --dirty --exclude demo

# Check for newer versions of dependencies
update:
    npx npm-check-updates

# Run tests in watch mode
watch:
    ./node_modules/.bin/vitest