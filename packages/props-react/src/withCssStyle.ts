/**
 * This file is identical to the preact version (../react/withStyleProps.ts) except for
 * - imports createElement(h) and types from Preact
 * - types are converted to preact-agnostic, generic types at the bottom
 *
 * The guts should be kept 1-to-1 identical, so that it's easier to maintain
 */

import { createElement as h, CSSProperties, FC, HTMLAttributes, RefObject } from 'react'
import styled, { ShorthandProps } from '@ustyle/styled-react'

export { styled }
export * from '@ustyle/styled-react'

export function toHyphenCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

interface ZxP extends CSSProperties, ShorthandProps {}

export interface CssProps {
  /** A string of css or classname to be added to the component */
  css?: string
  /** A ref to be passed down */
  forwardRef?: RefObject<any>
  /**
   * Like style prop, but enhanced with features like chakra
   *  - Array values are converted to media query breakpoints
   */
  zx?: {
    [k in keyof ZxP]:
      | ZxP[k]
      | [ZxP[k] | null, ZxP[k]]
      | [ZxP[k] | null, ZxP[k] | null, ZxP[k]]
      | [ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k]]
      | [ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k]]
      | [ZxP[k], ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k]]
      | [ZxP[k], ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k]]
  }
}

// TODO: Consolidate with styled.ts
export default function withCssStyle<C extends FC<{ className: HTMLAttributes<any>['className'] }>>(
  Component: C
): FC<Parameters<C>[0] & CssProps> {
  return (p: any) => {
    const { zx, ...passthroughProps } = p
    const Styled = styled(Component)(
      Object.entries(zx)
        .map(([k, v]) => {
          k = toHyphenCase(k)
          if (typeof v === 'number') v = v + 'px'
          if (Array.isArray(v)) {
            v = '[' + v.map((v) => (typeof v === 'number' ? v + 'px' : v)).join(',') + ']'
          }
          return k + ':' + v + ';'
        })
        .join('\n')
    )
    return h(Styled, passthroughProps)
  }
}
