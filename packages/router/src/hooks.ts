import {useEvent, useUpdate} from 'react-use'

import {RouteMatch} from './router-class.js'

/** Will trigger a re-render when location has changed  */
export function useLocationChanged() {
  const update = useUpdate()
  useEvent('locationchange', update)
}

/** Will call cb when location has changed  */
export function useLocationChangedCb(cb: (r: RouteMatch) => any) {
  useEvent('locationchange', cb)
}
