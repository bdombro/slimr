# Yarn branch

- THis experiment attempted to use yarn 3.4.1. Why? The [releases features](https://yarnpkg.com/features/release-workflow) and PnP looked helpful.
- Status: not working -- I started with the root and css package. Running `yarn pack` in root just packs the root module and no workspaces. Running `yarn prepack` in a package can't find the parent dependencies (i.e. eslint). I thought it may be PnP caused, but still happens after disabling PnP.
  - I think this is a deal breaker, bc one core benefit of my npm workspaces setup is that packages can share deps with the root.

## slimr

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css)
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths)
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled)
