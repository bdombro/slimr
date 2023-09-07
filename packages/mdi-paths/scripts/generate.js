/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const path = require('path')
const meta = require('@mdi/svg/meta.json')

const svgPathRegex = /\sd="(.*)"/
const startsWithNumberRegex = /^\d/

generate()

/** The entrypoint of this file, which generates a BUNCH of svg icon modules */
async function generate() {
  const basePath = path.resolve(__dirname, '..')
  const svgFilesPath = path.resolve(basePath, '../../node_modules/@mdi/svg/svg')
  const buildPath = path.resolve(basePath, '.')

  console.log('Collecting components...')
  const components = collectModules(svgFilesPath)
  console.log('Generating components...')

  const names = []
  for (const [, component] of components.entries()) {
    names.push(component.name)
    fs.writeFileSync(
      path.resolve(buildPath, component.fileName),
      `export default "${component.svgPath}"`
    )
    fs.writeFileSync(
      path.resolve(buildPath, component.fileName.slice(0, -2) + 'd.ts'),
      `declare const _default: string;
export default _default;`
    )
  }

  const packageJsonPath = path.resolve(buildPath, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))
  packageJson.exports = {
    "./components": "./components/components.js",
  }
  for (const name of names) {
    packageJson.exports[`./${name}`] = `./${name}.js`
  }
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

//   fs.writeFileSync(
//     path.resolve(buildPath, './IconNamesEnum.ts'),
//     `export enum IconNames {
// ${names.join(',\n')}
// }
// `
//   )
}

/** Return ALL of the icon paths */
function collectModules(svgFilesPath) {
  const svgFiles = fs.readdirSync(svgFilesPath)

  const icons = []
  for (const svgFile of svgFiles) {
    const origName = svgFile.slice(0, -4)
    const name = normalizeName(origName)

    const content = fs.readFileSync(path.join(svgFilesPath, svgFile))
    const svgPathMatches = svgPathRegex.exec(content)
    const svgPath = svgPathMatches && svgPathMatches[1]
    // skip on empty svgPath
    if (!svgPath) throw new Error('Empty SVG path')

    const icon = {
      name: name,
      aliases: [],
      fileName: name + '.js',
      svgPath,
    }

    const iconMeta = meta.find(entry => entry.name === origName)
    if (iconMeta) {
      icon.aliases = iconMeta.aliases
    }

    icons.push(icon)
  }

  const aliases = []
  const removeAliases = []
  for (const icon of icons) {
    for (const alias of icon.aliases) {
      const normalizedAlias = normalizeName(alias)

      // if the alias starts with a number, ignore it since JavaScript
      // doesn't support variable names starting with a number
      if (startsWithNumberRegex.test(normalizedAlias)) {
        continue
      }

      // check if alias duplicates top-level icon name and ignore
      if (icons.find(icon => icon.name.toLowerCase() === normalizedAlias.toLowerCase())) {
        continue
      }

      // check if alias itself is duplicated
      const duplicateAlias = aliases.find(
        alias2 => alias2.name.toLowerCase() === normalizedAlias.toLowerCase()
      )
      if (duplicateAlias) {
        // check if duplicate alias is on same icon
        // if not note for removal from final list
        if (duplicateAlias.aliasFor !== icon.name) {
          // console.warn(`Duplicate alias ${normalizedAlias} (${icon.name}, ${duplicateAlias.aliasFor})`);
          removeAliases.push(duplicateAlias.name)
          continue
        }

        continue
      }

      aliases.push({
        name: normalizedAlias,
        aliasFor: icon.name,
        fileName: normalizedAlias + '.js',
        svgPath: icon.svgPath,
      })
    }

    // removed no longer required aliases array
    delete icon.aliases
  }

  // clean up remaining alias duplicates
  for (const aliasName of removeAliases) {
    const index = aliases.find(alias => aliasName === alias)
    aliases.splice(index, 1)
  }

  return [...icons, ...aliases]
}

/** Make pascal-case */
function normalizeName(name) {
  return name
    .split(/[ -]/g)
    .map(part => {
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')
}
