import React, {memo, useEffect, useMemo, useState} from 'react'

import {Lazy} from './lazy.js'
import type {RouterInstance} from './router-class.js'

/**
 * A Switching component, which renders the first matching route
 */
export const Switch = memo(function Switch({router}: {router: RouterInstance}) {
  const [route, setRoute] = useState(router.find(new URL(location.href)))

  useEffect(() => router.subscribe(setRoute), [])

  return useMemo(
    () => (
      <Lazy
        loader={route.loader}
        props={{route, url: new URL(location.href)}}
        onLoad={router.onLoad}
      />
    ),
    [route]
  )
})
