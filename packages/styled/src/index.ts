import { createElement, CSSProperties, FC, forwardRef, HTMLAttributes } from 'react'
import css, { classJoin, ShorthandProps, shorthandProps, shorthandPropsMap, TemplateStringProps } from '@ustyle/css'

export { css }
export * from '@ustyle/css'

/** A type that represents all the css properties + shorthand props */
export interface ZxProps extends CSSProperties, ShorthandProps {}
type ZxP = ZxProps

type Zx = {
  [k in keyof ZxP]:
    | ZxP[k]
    | [ZxP[k] | null, ZxP[k]]
    | [ZxP[k] | null, ZxP[k] | null, ZxP[k]]
    | [ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k]]
    | [ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k]]
    | [ZxP[k], ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k]]
    | [ZxP[k], ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k] | null, ZxP[k]]
}

export interface SCProps {
  /** Like zx prop, but applies only on active */
  _active?: Zx
  className?: string
  /** A string of css or classname to be added to the component */
  css?: string
  /** Like zx prop, but applies only on hover */
  _hover?: Zx
  id?: string
  style?: CSSProperties
  /**
   * Like style prop, but enhanced with features like chakra
   *  - Array values are converted to media query breakpoints
   *  - Numbers are converted to px
   *  - Shorthand props are supported
   */
  zx?: Zx
}

/** Styled Component: Like FunctionalComponent but adds SCProps */
export type SC<T extends { className?: HTMLAttributes<any>['className'] }> = FC<T & SCProps>

function toKebabCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

function toCamelCase(str: string) {
  return str.replace(/-./g, (x) => x[1].toUpperCase())
}

function expandShorthandProps(zx: Zx) {
  return Object.entries(zx).reduce((acc, [k, v]) => {
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
      acc[toCamelCase(shorthandPropsMap[k as keyof typeof shorthandPropsMap])] = v
    } else {
      acc[k] = v
    }
    return acc
  }, {} as any)
}

function zxToCss(zx: Zx): string {
  return Object.entries(zx)
    .map(([k, v]) => {
      if (!v) return ''
      k = toKebabCase(k)
      if (typeof v === 'number') v = v + 'px'
      if (Array.isArray(v)) {
        // @ts-ignore
        v = '[' + v.map((v) => (typeof v === 'number' ? v + 'px' : v)).join(',') + ']'
      }
      return k + ':' + v + ';'
    })
    .join('\n')
}

/**
 * A lightweight alternative to styled-components
 * @param function - a functional component to be styled; must accept a className prop
 * @returns a function that accepts a template string of css returns a decorated functional component
 */
export default function styled<C extends FC<any>>(Component: C) {
  return (...cssProps: TemplateStringProps) => {
    const className = css(...cssProps)
    const CStyled = forwardRef((props: SCProps, ref) => {
      let { _active, css: _css, _hover, zx = {}, ...rest } = props

      const hasMediaQuery = Object.values(zx).some((v) => Array.isArray(v))
      let zxClass = ''
      // If has media query styles, use css class. Otherwise favor inline styles
      if (hasMediaQuery) {
        zxClass = css(zxToCss(zx))
      } else {
        zx = expandShorthandProps(zx)
        rest.style = { ...rest.style, ...zx } as CSSProperties
      }

      const activeClass = _active
        ? css(`
        &:active {
        ${zxToCss(_active)}
        }
      `)
        : ''

      const hoverClass = _hover
        ? css(`
        &:hover {
        ${zxToCss(_hover)}
        }
      `)
        : ''

      return createElement(Component, {
        ref,
        ...rest,
        className: classJoin(
          className,
          _css ? (_css.includes(':') ? css(_css) : _css) : undefined,
          zxClass,
          activeClass,
          hoverClass,
          props.className
        ),
      })
    })
    CStyled.toString = () => '.' + className
    return CStyled as unknown as SC<Parameters<C>[0]>
  }
}
