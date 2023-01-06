/** Breakpoints like chakra */
const breakPoints = ['30em', '48em', '62em', '80em', '96em']

/** Joins class names and filters out blanks */
export function classJoin(...classes: any[]) {
  return classes.filter((c) => c && typeof c === 'string').join(' ')
}

// delete css comments i.e. {/* blah */}
function deleteComments(css: string) {
  return css.replace(/{\/\*[\s\S]*?(?=\*\/})\*\/}/gm, '')
}

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
      const [_, prop, vals] = [...l.matchAll(/([A-Za-z\-]*):[ ]*\[([^\]]+)\]/g)]?.[0] ?? []
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
  /** shorthand for css:align-items */
  ai?: string
  /** shorthand for css:border */
  b?: string | number
  /** shorthand for css:border-radius */
  br?: string | number
  /** shorthand for css:background */
  bg?: string
  /** shorthand for css:color */
  c?: string
  /** shorthand for css:display */
  d?: string
  /** shorthand for css:flex */
  f?: string
  /** shorthand for css:flex-direction */
  fd?: string
  /** shorthand for css:height */
  h?: number | string
  /** shorthand for css:justify-content */
  jc?: string
  /** shorthand for css:margin */
  m?: number | string
  /** shorthand for css:margin-left */
  ml?: number | string
  /** shorthand for css:margin-right */
  mr?: number | string
  /** shorthand for css:margin-top */
  mt?: number | string
  /** shorthand for css:margin-bottom */
  mb?: number | string
  /** shorthand for css:margin-top & margin-bottom */
  my?: number | string
  /** shorthand for css:margin-left & margin-right */
  mx?: number | string
  /** shorthand for css:max-width */
  maxW?: number | string
  /** shorthand for css:min-width */
  minW?: number | string
  /** shorthand for css:padding */
  p?: number | string
  /** shorthand for css:padding-left */
  pl?: number | string
  /** shorthand for css:padding-right */
  pr?: number | string
  /** shorthand for css:padding-top */
  pt?: number | string
  /** shorthand for css:padding-bottom */
  pb?: number | string
  /** shorthand for css:padding-top & padding-bottom */
  py?: number | string
  /** shorthand for css:padding-left & padding-right */
  px?: number | string
  /** shorthand for css:position */
  pos?: number | string
  /** shorthand for css:width */
  w?: number | string
  /** shorthand for css:z-index */
  z?: number | string
}
export const shorthandPropsMap: Record<keyof Omit<ShorthandProps, 'mx' | 'my' | 'px' | 'py'>, string> = {
  ai: 'align-items',
  b: 'border',
  br: 'border-radius',
  bg: 'background',
  c: 'color',
  d: 'display',
  f: 'flex',
  fd: 'flex-direction',
  h: 'height',
  jc: 'justify-content',
  m: 'margin',
  ml: 'margin-left',
  mr: 'margin-right',
  mt: 'margin-top',
  mb: 'margin-bottom',
  maxW: 'max-width',
  minW: 'min-width',
  p: 'padding',
  pl: 'padding-left',
  pr: 'padding-right',
  pt: 'padding-top',
  pb: 'padding-bottom',
  pos: 'position',
  w: 'width',
  z: 'z-index',
}
export const shorthandProps = [...Object.keys(shorthandPropsMap), 'mx', 'my', 'px', 'py']

/** Expand short-hand css props to full */
function expandProps(css: string) {
  css = '\n' + css // inject a newline to make the regex easier
  // Handle 'mx', 'my', 'px', 'py'
  css = css.replace(/([mp])x:([^;]*);/g, '$1l:$2;$1r:$2').replace(/([mp])y:([^;]*);/g, '$1t:$2;$1b:$2')
  Object.entries(shorthandPropsMap).forEach(([k, v]) => {
    css = css.replace(new RegExp(`([ \n\t;])${k}:`, 'g'), `$1${v}:`)
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

/** Trims whitespace for every line */
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
 * - Batches adds for performance
 *
 * @param css - css to be injected
 * @returns void
 */
export function addCss(css: string) {
  addCss.que.add(css)
  setTimeout(() => {
    const css = [...addCss.que].join('\n')
    if (css) {
      addCss.que.clear()
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
addCss.que = new Set<string>()

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

    addCss(css)
  }
  return className
}
createClass.count = 0
createClass.history = new Map<string, string>()
