import { createElement, CSSProperties, FC, forwardRef, HTMLAttributes } from 'react'
import css, { classJoin, ShorthandProps, shorthandProps, shorthandPropsMap, TemplateStringProps } from '@ustyle/css'

export { css }
export * from '@ustyle/css'

/** A type that represents all the css properties + shorthand props */
export interface ZxProps extends CSSProperties, ShorthandProps {}
type ShP = ShorthandProps
type ZxP = ZxProps

type ScShorthandProps = {
  [k in keyof ShP]:
    | ShP[k]
    | [ShP[k] | null, ShP[k]]
    | [ShP[k] | null, ShP[k] | null, ShP[k]]
    | [ShP[k] | null, ShP[k] | null, ShP[k] | null, ShP[k]]
    | [ShP[k] | null, ShP[k] | null, ShP[k] | null, ShP[k] | null, ShP[k]]
    | [ShP[k], ShP[k] | null, ShP[k] | null, ShP[k] | null, ShP[k] | null, ShP[k]]
    | [ShP[k], ShP[k] | null, ShP[k] | null, ShP[k] | null, ShP[k] | null, ShP[k]]
}

export interface SCProps extends ScShorthandProps {
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
      let { css: _css, forwardRef, zx = {}, ...rest } = props

      // Pluck out shorthand props
      shorthandProps.forEach((k) => {
        if (k in props) {
          zx[k] = props[k]
          delete rest[k]
        }
      })

      const hasMediaQuery = Object.values(zx).some((v) => Array.isArray(v))
      let zxClass = ''
      // If has media query styles, use css class. Otherwise favor inline styles
      if (hasMediaQuery) {
        zxClass = css(
          Object.entries(zx)
            .map(([k, v]) => {
              if (!v) return ''
              k = toHyphenCase(k)
              if (typeof v === 'number') v = v + 'px'
              if (Array.isArray(v)) {
                v = '[' + v.map((v) => (typeof v === 'number' ? v + 'px' : v)).join(',') + ']'
              }
              return k + ':' + v + ';'
            })
            .join('\n')
        )
      } else {
        // expand shorthand props
        zx = Object.entries(zx).reduce((acc, [k, v]) => {
          if (k === 'mx') {
            acc.marginLeft = v
            acc.marginRight = v
          } else if (k === 'my') {
            acc.marginTop = v
            acc.marginBottom = v
          } else if (k === 'px') {
            acc.paddingLeft = v
            acc.paddingRight = v
          } else if (k === 'py') {
            acc.paddingTop = v
            acc.paddingBottom = v
          } else if (k in shorthandPropsMap) {
            acc[shorthandPropsMap[k as keyof typeof shorthandPropsMap]] = v
          } else {
            acc[k] = v
          }
          return acc
        }, {} as any)
        rest.style = { ...rest.style, ...zx }
      }

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
