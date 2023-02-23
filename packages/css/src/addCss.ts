/**
 * Injects css to the page head
 *
 * - Lazy: Will not be added until the component mounts, if called from within a component
 * - Batches dom changes for better performance
 * - Has local cache to recall prior adds, to reduce duplicates and dom changes
 *
 * @param css
 * css to be injected
 *
 * @returns void
 *
 * @example
 * addCss(`.myClass { color: red; }`) // queues css for injection
 * addCss(`.myClass { color: red; }`) // is duplicate so will not be added
 * addCss(`.myClass { color: blue; }`) // queues css for injection
 * // ...and the queue will be executed next javascript tick
 */
export function addCss(css: string) {
  addCss.que.add(css)
  setTimeout(() => {
    const css = [...addCss.que].join('\n')
    if (css) {
      addCss.que.clear()
      const s = document.createElement('style')
      s.id = `u${addCss.count++}`
      s.innerHTML = css
      document.head.appendChild(s)
    }
  }, 0)
}
addCss.que = new Set<string>()
addCss.count = 0
