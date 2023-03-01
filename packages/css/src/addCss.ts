import {appendStyle} from '@slimr/util'

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
    if (addCss.que.size) {
      appendStyle({
        id: `u${addCss.count++}`,
        innerHTML: [...addCss.que].join('\n'),
      })
      addCss.que.clear()
    }
  }, 0)
}
addCss.que = new Set<string>()
addCss.count = 0
