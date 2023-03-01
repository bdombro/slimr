# 🪶 @slimr/mdi-paths [![npm package](https://img.shields.io/npm/v/@slimr/mdi-paths.svg?style=flat-square)](https://npmjs.org/package/@slimr/mdi-paths)

[Material Design Icon](https://materialdesignicons.com) paths for any TS/JS project, packaged as single files default export = path.

Compared to Iconify

- Has all of the mdi aliases
- Uses Lazy ESM Imports instead of fetching from CDN/internet
- Is smaller bundle impact - icon files are smaller, React component smaller

Features

- Lazy ESM Imports instead of fetching from CDN/internet
- Each icon is a seperate Javascript module, named to match the name in [https://materialdesignicons.com](https://materialdesignicons.com), so easy to find
- For React fans, you can use LazyIconSvg or IconSvg from `@slimr/mdi-paths/react`.

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css) - Framework agnostic css-in-js features inspired by the popular Emotion lib
- [@slimr/forms](https://www.npmjs.com/package/@slimr/forms) - A minimalistic form hook
- [@slimr/hooks](https://www.npmjs.com/package/@slimr/hooks) - A collection of useful 1st and third party react hooks
- [@slimr/markdown](https://www.npmjs.com/package/@slimr/markdown) - A simple component and slim markdown-to-html parser
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths) - A basic Icon component and Material Design icon svg paths, code-split by path.
- [@slimr/router](https://www.npmjs.com/package/@slimr/router) - A novel React-web router that supports stack routing
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled) - css-in-js features inspired by the popular styled-components and Chakra-UI libs
- [@slimr/swr](https://www.npmjs.com/package/@slimr/swr) - A React hook for fetching data that supports stale-while-refresh eager rendering
- [@slimr/util](https://www.npmjs.com/package/@slimr/util) - Framework agnostic Javascript polyfills

## Installation

```bash
npm install @slimr/mdi-paths
```

## Usage

Just search for an icon on [materialdesignicons.com](https://materialdesignicons.com) and look for its name.

The name translates to PascalCase in `@slimr/mdi-paths`.

Also it's possible to import with an alias. You can find them on the detail page of the respective icon.

For React, I recommend you use the bundled react components, LazyIconSvg and IconSvg.

Example with LazyIconSvg:

```typescript
// icon.tsx
import {LazyIconSvg, LazyIconSvgProps} from '@slimr/mdi-paths/react'

const icons = {
  home: () => import('@slimr/mdi-paths/Home'),
}

type IconKeys = keyof typeof icons
type IconProps = Omit<LazyIconSvgProps, 'name' | 'svgPathImport'> & {name: IconKeys}

export function Icon({name, ...props}: IconProps) {
  return <LazyIconSvg pathImporter={icons[name]} {...props} />
}
```

## Dependencies, References & Inspirations

- [mdi-react](https://npmjs.com/package/mdi-react) - The generator in this package was adapted from that one (Thanks!). This package achieves similar things but does so with much less bandwidth penalty per icon.
- [materialdesignicons.com](https://materialdesignicons.com) - Where to browse icons
- [@mdi/js](https://npmjs.com/package/@mdi/js) - Very similar to this lib, but puts all the paths in one file
- [@mdi/svg](https://npmjs.com/package/@mdi/svg) - Where this lib gets the icons from
