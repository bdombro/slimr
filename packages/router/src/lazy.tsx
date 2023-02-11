/* eslint-disable @typescript-eslint/no-explicit-any */
import {Suspense, lazy, useEffect, useState} from 'react'

/**
 * Loads a component lazily and keeps the prior component as fallback. Also calls onLoad.
 *
 * Sadly, there is still some flickering.
 */
export function Lazy({
  loader,
  props = {},
  onLoad = () => {},
}: {
  /**
   * A callback that loads a component, i.e.
   * ```typescript
   * () => import('./index.tsx')`
   * ```
   */
  loader: () => Promise<any>
  /**
   * Props to be passed to the loaded component
   */
  props?: any
  /**
   * Callback to be called when the component is loaded
   */
  onLoad?: () => void
}) {
  const [state, setState] = useState<{
    current: JSX.Element | null
    last: JSX.Element | null
  }>({current: null, last: null})

  const Wrapped = () => {
    useEffect(onLoad, [])
    const C = lazy(loader)
    return (
      <Suspense fallback={state.last}>
        <C {...props} />
      </Suspense>
    )
  }

  useEffect(() => {
    // Load the component before rendering it. This helps prevent flickering.
    loader().then(() => {
      setState(s => ({
        ...s,
        current: <Wrapped />,
        last: state.current,
      }))
    })
  }, [loader, props])

  return state?.current
}

export type LazyProps = Parameters<typeof Lazy>[0]
