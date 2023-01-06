import { createElement, CSSProperties, FC, forwardRef, HTMLAttributes } from 'react'
import css, { classJoin, ShorthandProps, shorthandProps, TemplateStringProps } from '@ustyle/css'

export { css }
export * from '@ustyle/css'

/** A type that represents all the css properties + shorthand props */
export interface ZxProps extends CSSProperties, ShorthandProps {}
type ZxP = ZxProps

export interface SCProps extends ShorthandProps {
  /** A string of css or classname to be added to the component */
  css?: string
  /**
   * Like style prop, but enhanced with features like chakra
   *  - Array values are converted to media query breakpoints
   *  - Numbers are converted to px
   *  - Shorthand props are supported
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

/** Styled Component: Like FunctionalComponent but adds SCProps */
export type SC<T extends { className: HTMLAttributes<any>['className'] }> = FC<T & SCProps>

export function toHyphenCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * A lightweight alternative to styled-components
 * @param function - a functional component to be styled; must accept a className prop
 * @returns a function that accepts a template string of css returns a decorated functional component
 */
export default function styled<C extends FC<any>>(Component: C) {
  return (...cssProps: TemplateStringProps) => {
    const className = css(...cssProps)
    const CStyled = forwardRef((props: any, ref) => {
      const { css: _css, forwardRef, zx = {}, ...rest } = props

      shorthandProps.forEach((k) => {
        if (k in props) {
          zx[k] = props[k]
          delete rest[k]
        }
      })

      const zxClass = Object.values(zx).filter((p) => p).length
        ? css(
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
        : ''

      return createElement(Component, {
        ref,
        ...rest,
        className: classJoin(
          className,
          _css ? (_css.includes(':') ? css(_css) : _css) : undefined,
          zxClass,
          props.className
        ),
      })
    })
    CStyled.toString = () => '.' + className
    return CStyled as unknown as SC<Parameters<C>[0]>
  }
}
