import {T2SProps, t2s} from '@slimr/util'

import {addCss} from './addCss.js'
import {expandShorthands} from './shorthandProps.js'

/**
 * Joins class names and omits falsey props
 *
 * @param classes
 * class names to be joined
 *
 * @returns a string of joined class names
 *
 * @example
 * ```typescript
 * classJoin('a', 'b', 'c') // 'a b c'
 * classJoin('a', 0, 'b', null, 'c') // 'a b c'
 * ```
 */
export function classJoin(...classes: (string | 0 | null | undefined)[]) {
  return classes.filter(c => c && typeof c === 'string').join(' ')
}

/**
 * Upserts and returns a unique css class for a given css string
 *
 * @param cssString
 * string or template string, to be injected. Shorthand props are supported (see Readme).
 *
 * @returns a unique class name
 *
 * @example
 * ```typescript
 * c1 = createClass('c: red;') // queues the create of new css class 's0'
 * c2 = createClass('c: red;') // is duplicate so will return 's0'
 * c3 = createClass`c: red;` // same
 * c4 = css`c: red;` // same
 * // c1 = c2 = c3 = c4
 * <div className={css`c: red;`} /> // will resolve to 's0' like above
 * c5 = css`c: blue;` // queues the create of new css class 's1'
 * c6 = css`w: [100%, null, 400px]` // width = 100% on mobile and table, 400px on desktop
 * ```
 * ...and the queue will be executed next javascript tick
 */
export function createClass(...p: T2SProps) {
  let css = t2s(...p)
  if (!css) return ''
  let className = createClass.history.get(css)
  if (!className) {
    className = 's' + createClass.count++
    createClass.history.set(css, className)

    css = deleteComments(css)
    css = expandShorthands(css)
    css = expandArrayValues(css)
    const qs = findQueries(css)

    for (const q of qs.reverse()) {
      css = css.slice(0, q.start) + css.slice(q.end)
    }
    qs.reverse()

    css = `.${className}{\n${css}\n}\n`
    css += qs
      .map(q => {
        if (q.query.startsWith('&')) {
          return `.${className}${q.query.slice(1)}{\n${q.innerBody}\n}`
        }
        if (q.query.startsWith('@keyframes')) {
          return q.outerBody
        }
        return `${q.query}{\n.${className}{${q.innerBody}\n}\n}`
      })
      .join('\n')

    css = trimByLine(css) + '\n\n'

    addCss(css)
  }
  return className
}
/** Breakpoints like chakra */
createClass.breakPoints = ['30em', '48em', '62em', '80em', '96em']
createClass.count = 0
createClass.history = new Map<string, string>()

/** delete css comments **/
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
    .map(l => {
      // eslint-disable-next-line no-useless-escape
      const [, prop, vals] = [...l.matchAll(/([A-Za-z\-]*):[ ]*\[([^\]]+)\]/g)]?.[0] ?? []
      if (vals) {
        return vals
          .split(',')
          .map((val, i) => {
            val = val.trim()
            if (!val || val === 'null' || val === 'undefined') return ''
            if (i === 0) {
              return `${prop}: ${val};`
            }
            return `@media (min-width: ${createClass.breakPoints[i - 1]}) { ${prop}: ${val}; }`
          })
          .join('\n')
      }
      return l
    })
    .join('\n')
}

/** Find @keyframes, @media, @container queries in css **/
function findQueries(css: string) {
  const queries: {
    start: number
    end: number
    query: string
    outerBody: string
    innerBody: string
  }[] = []
  for (const m of css.matchAll(/[@&]/gm)) {
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
            start: m.index!,
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
function trimByLine(css: string) {
  return css
    .split('\n')
    .map(l => l.trim())
    .filter(l => l)
    .join('\n')
}
