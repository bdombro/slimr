import {debounce} from '@slimr/util'

/**
 * Set the CSS variable `--dvh` to the height of the viewport.
 *
 * Is more reliable than `100vh` because it takes into account the height of
 * the browser's UI elements (e.g. address bar, status bar, etc).
 */
if (!('chrome' in window)) {
  const setViewportHeight = debounce(() => {
    document.documentElement.style.setProperty('--dvh', `${window.innerHeight}px`)
  })
  setViewportHeight()
  addEventListener('resize', setViewportHeight)
}

export {}
