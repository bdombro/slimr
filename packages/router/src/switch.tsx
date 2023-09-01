import React, {memo, useEffect, useState} from 'react'

import type {RouterInstance} from './router-class.js'

/**
 * A Switching component, which renders the first matching route
 */
export const Switch = memo(function Switch({router}: {router: RouterInstance}) {
  const [route, setRoute] = useState(router.find(new URL(location.href)))

  useEffect(() => router.subscribe(setRoute), [])

  useEffect(router.onLoad, [route])

  const C = route.component
  return <C route={route} url={new URL(location.href)} />
})
