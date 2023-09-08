import './styles.pcss'

import {Switch} from '@slimr/router'
import {debounce} from '@slimr/util'

import {router} from './router'

/**
 * Set the CSS variable `--dvh` to the height of the viewport.
 *
 * Is more reliable than `100vh` because it takes into account the height of
 * the browser's UI elements (e.g. address bar, status bar, etc).
 */
if (!('chrome' in window)) {
  const setViewportHeight = () => {
    document.documentElement.style.setProperty('--dvh', `${window.innerHeight}px`)
  }
  setViewportHeight()
  addEventListener('resize', debounce(setViewportHeight))
}

/**
 * The main app component
 */
export function App() {
  return (
    <div data-testid="appComponent">
      <Switch router={router} />
    </div>
  )
}
