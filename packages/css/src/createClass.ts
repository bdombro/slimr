import * as util from './util.js'
import * as tss from './tss.js'

/**
 * A lightweight alternative to emotion
 *
 * @param templateString css - to be transpiled and injected
 * @returns a unique class name
 */
/**
 * Injects css/tss to the page if they don't already exist and creates unique class names
 *
 * @param tss - css or tss to be transpiled and injected. :self is replaced by a unique class
 * @returns a unique class name
 *
 * tss is a superset of css
 * - tab based closure (i.e. replaces indentation with { and })
 *
 * Returns the unique class name
 */
export default function createClass(...props: util.TemplateStringProps) {
  let _css = util.templateStrPropsToStr(...props)
  let className = createClass.history.get(_css)
  if (!className) {
    className = 's' + createClass.count++
    createClass.history.set(_css, className)
    _css = _css.replace(/:(self|root)/g, '.' + className)
    if (tss.isTss(_css)) {
      _css = tss.toCss(_css)
    } else {
      _css = util.normalizeIndent(_css)
      util.checkUnclosed(_css)
    }
    createClass.addToDom(_css)
  }
  return className
}
createClass.count = 0
createClass.history = new Map<string, string>()

/**
 * Enqueus css to be added to dom
 */
createClass.addToDom = (_css: string) => {
  createClass.queue.add(_css)
  setTimeout(() => {
    if (createClass.queue.size) {
      const css = [...createClass.queue].join('\n')
      createClass.queue.clear()
      let style = document.getElementById('chakra-lite') as HTMLStyleElement
      if (!style) {
        style = document.createElement('style')
        style.id = 'chakra-lite'
        style.innerHTML = createClass.baseCss + css
        document.head.appendChild(style)
      } else {
        style.innerHTML += css
      }
    }
  }, 0)
}
createClass.queue = new Set()
createClass.baseCss = `
.container {
	container-type: inline-size;
}
`
