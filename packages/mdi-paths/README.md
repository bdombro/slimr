# @slimr/mdi-paths [![npm package](https://img.shields.io/npm/v/@slimr/mdi-paths.svg?style=flat-square)](https://npmjs.org/package/@slimr/mdi-paths) [![Material Design Icons version](https://img.shields.io/badge/mdi-v7.1.96-blue.svg?style=flat-square)](https://materialdesignicons.com)

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

- [@slimr/css](https://www.npmjs.com/package/@slimr/css)
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths)
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled)

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
import { LazyIconSvg, LazyIconSvgProps } from '@slimr/mdi-paths/react'

const icons = {
  home: () => import('@slimr/mdi-paths/Home'),
}

type IconKeys = keyof typeof icons
type IconProps = Omit<LazyIconSvgProps, 'name' | 'svgPathImport'> & { name: IconKeys }

export function Icon({ name, ...props }: IconProps) {
  return <LazyIconSvg pathImporter={icons[name]} {...props} />
}
```

## References

- [mdi-react](https://npmjs.com/package/mdi-react) - The generator in this package was adapted from that one (Thanks!). This package achieves similar things but does so with much less bandwidth penalty per icon.
- [materialdesignicons.com](https://materialdesignicons.com) - Where to browse icons
- [@mdi/js](https://npmjs.com/package/@mdi/js) - Very similar to this lib, but puts all the paths in one file
- [@mdi/svg](https://npmjs.com/package/@mdi/svg) - Where this lib gets the icons from
