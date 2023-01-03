/** Joins class names and filters out blanks */
export function classJoin(...classes: any[]) {
  return classes.filter((c) => c && typeof c === 'string').join(' ')
}

// delete css comments i.e. {/* blah */}
function deleteComments(css: string) {
  return css.replace(/{\/\*[\s\S]*?(?=\*\/})\*\/}/gm, '')
}

const breakPoints = ['30em', '48em', '62em', '80em', '96em']
/**
 * Expands array values into media queries
 *
 * Inspired by https://chakra-ui.com/docs/styled-system/responsive-styles
 */
function expandArrayValues(css: string) {
  if (!css.includes('[')) return css
  return css
    .split('\n')
    .map((l) => {
      const [_, prop, vals] = [...l.matchAll(/([A-Za-z]*):[ ]*\[([^\]]+)\]/g)]?.[0] ?? []
      if (vals) {
        return vals
          .split(',')
          .map((val, i) => {
            val = val.trim()
            if (!val || val === 'null' || val === 'undefined') return ''
            if (i === 0) {
              return `${prop}: ${val};`
            }
            return `@media (min-width: ${breakPoints[i - 1]}) { ${prop}: ${val}; }`
          })
          .join('\n')
      }
      return l
    })
    .join('\n')
}

export interface ShorthandProps {
  d?: string
  h?: number | string
  m?: number | string
  ml?: number | string
  mr?: number | string
  ms?: number | string
  me?: number | string
  mt?: number | string
  mb?: number | string
  my?: number | string
  mx?: number | string
  p?: number | string
  pl?: number | string
  pr?: number | string
  ps?: number | string
  pe?: number | string
  pt?: number | string
  pb?: number | string
  py?: number | string
  px?: number | string
  w?: number | string
  z?: number | string
}
const shorthandPropsMap: Record<keyof Omit<ShorthandProps, 'mx' | 'my' | 'px' | 'py'>, string> = {
  d: 'display',
  h: 'height',
  m: 'margin',
  ml: 'margin-left',
  mr: 'margin-right',
  ms: 'margin-inline-start',
  me: 'margin-inline-end',
  mt: 'margin-top',
  mb: 'margin-bottom',
  p: 'padding',
  pl: 'padding-left',
  pr: 'padding-right',
  ps: 'padding-inline-start',
  pe: 'padding-inline-end',
  pt: 'padding-top',
  pb: 'padding-bottom',
  w: 'width',
  z: 'z-index',
}

/** Expand short-hand css props to full */
function expandProps(css: string) {
  css = '\n' + css // inject a newline to make the regex easier
  // Handle 'mx', 'my', 'px', 'py'
  css = css.replace(/([mp])x:([^;]*);/g, '$1s:$2;$1e:$2')
  css = css.replace(/([mp])y:([^;]*);/g, '$1s:$2;$1e:$2')
  Object.entries(shorthandPropsMap).forEach(([k, v]) => {
    css = css.replace(new RegExp(`([ \n\t])${k}:`, 'g'), `$1${v}:`)
  })
  return css.trim()
}

/** Find @keyframes, @media, @container queries in css **/
function findQueries(css: string) {
  const queries = []
  for (let m of css.matchAll(/[@&]/gm)) {
    let query = ''
    let bodyStart = 0
    let openCount = 0
    for (let i = m.index!; i < css.length; i++) {
      if (css[i] === '{') {
        if (openCount === 0) {
          query = css.slice(m.index, i).trim()
          bodyStart = i + 1
        }
        openCount++
      } else if (css[i] === '}') {
        openCount--
        if (openCount === 0) {
          queries.push({
            start: m.index,
            end: i + 1,
            query,
            outerBody: css.slice(m.index, i + 1),
            innerBody: css.slice(bodyStart, i),
          })
          break
        }
      }
    }
    if (openCount !== 0) console.error(`${query} not closed: "${css}"`)
  }
  return queries
}

/** Ensure the number of open '{' equals the number of closed '}' */
function hasUnclosed(css: string) {
  return css.split('{').length !== css.split('}').length
}

/** Trims whitespace */
function trim(css: string) {
  return css
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l)
    .join('\n')
}

/**
 * Assemble a string from a template string array and a list of placeholders.
 *
 * - If the first argument is a string, it is returned as is.
 *
 * i.e.
 * myFoo(...props: TemplateStringProps) => {
 *  const inputStr = t2s(...props);
 * }
 * myFoo`hello ${name}` => 'hello world'
 * myFoo(`hello ${name}`) => 'hello world'
 */
export function t2s(...tsp: TemplateStringProps) {
  const [s, ...p] = tsp
  return typeof s === 'string' ? s : s.map((s, i) => s + (p?.[i] ?? '')).join('')
}
export type TemplateStringProps = [strings: TemplateStringsArray | string, ...placeHolders: string[]]

/**
 * Injects css to the page
 *
 * - Skips if already added
 * - Batches adds for performance
 *
 * @param css - css to be injected
 * @returns void
 */
function addCssWithOptions(css: string, skipHistory = false) {
  if (!skipHistory) {
    if (addCssWithOptions.history.has(css)) return
    addCssWithOptions.history.add(css)
  }
  if (hasUnclosed(css)) {
    return console.error(`Error: Unclosed css: "\n${css}\n"`)
  }
  addCssWithOptions.que.add(css)
  setTimeout(() => {
    const css = [...addCssWithOptions.que].join('\n')
    if (css) {
      addCssWithOptions.que.clear()
      let s = document.getElementById('ustyle') as HTMLStyleElement
      if (!s) {
        s = document.createElement('style')
        s.id = 'ustyle'
        s.innerHTML = css
        document.head.appendChild(s)
      } else {
        s.innerHTML += css
      }
    }
  }, 0)
}
addCssWithOptions.count = 0
addCssWithOptions.history = new Set<string>()
addCssWithOptions.que = new Set<string>()

/**
 * Injects css to the page
 *
 * - Skips if already added
 * - Batches adds for performance
 *
 * @param css - css as string or template string to be injected
 * @returns void
 */
export function addCss(...p: TemplateStringProps) {
  return addCssWithOptions(t2s(...p))
}

/**
 * Injects css and creates unique class names
 *
 * - Skips if already added
 *
 * @param css - string or template string, to be injected
 * @returns a unique class name
 */
export default function createClass(...p: TemplateStringProps) {
  let css = t2s(...p)
  let className = createClass.history.get(css)
  if (!className) {
    className = 's' + createClass.count++
    createClass.history.set(css, className)

    css = deleteComments(css)
    css = expandProps(css)
    css = expandArrayValues(css)
    const qs = findQueries(css)

    for (let q of qs.reverse()) {
      css = css.slice(0, q.start) + css.slice(q.end)
    }

    css = `.${className}{\n${css}\n}\n`
    css += qs
      .map((q) => {
        if (q.query.startsWith('&')) {
          return `.${className}${q.query.slice(1)}{\n${q.innerBody}\n}`
        }
        if (q.query.startsWith('@keyframes')) {
          return q.outerBody
        }
        return `${q.query}{\n.${className}{${q.innerBody}\n}\n}`
      })
      .join('\n')

    css = trim(css) + '\n\n'

    addCssWithOptions(css, true)
  }
  return className
}
createClass.count = 0
createClass.history = new Map<string, string>()
