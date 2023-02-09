import { createElement, CSSProperties, FC, forwardRef, HTMLAttributes } from 'react'
import css, { classJoin, ShorthandProps, shorthandProps, shorthandPropsMap, TemplateStringProps } from '@slimr/css'

export { css }
export * from '@slimr/css'

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

type _Props = {
  [k in keyof Zx as `_${k}`]?: Zx[k]
}

export interface SCProps extends _Props {
  /** Like zx prop, but applies only on :active */
  _active?: Zx
  className?: string
  /** A string of css or classname to be added to the component */
  _css?: string
  /** Like zx prop, but applies only when user prefers dark theme */
  _dark?: Zx
  /** Like zx prop, but applies only on :focus */
  _focus?: Zx
  /** Like zx prop, but applies only on :focus-visible */
  _focusVisible?: Zx
  /** Like zx prop, but applies only on :focus-within */
  _focusWithin?: Zx
  /** Like zx prop, but applies only on :hover */
  _hover?: Zx
  style?: CSSProperties
  /** Like zx prop, but applies only on :target */
  _target?: Zx
  /** Like zx prop, but applies only on :visited */
  _visited?: Zx
  /**
   * Like style prop, but enhanced with features like chakra
   *  - Array values are converted to media query breakpoints
   *  - Numbers are converted to px
   *  - Shorthand props are supported
   */
  _zx?: Zx
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
    /**
     * A functional component that accepts Styled Props
     */
    const CStyled = forwardRef((props: SCProps, ref) => {
      let {
        _active,
        _css,
        _dark,
        _focus,
        _focusVisible,
        _focusWithin,
        _hover,
        _target,
        _visited,
        _zx = {},
        ...rest
      } = props

      // Pluck out $ prefixed props
      Object.entries(props).forEach(([k, v]) => {
        if (k.startsWith('_')) {
          // @ts-ignore
          _zx[k.slice(1)] = v
          // @ts-ignore
          delete rest[k]
        }
      })

      let cssStr = ''

      if (_active) {
        cssStr += `
          &:active {
          ${zxToCss(_active)}
          }
        `
      }
      if (_dark) {
        cssStr += `
          @media (prefers-color-scheme: dark) {
          ${zxToCss(_dark)}
          }
        `
      }
      if (_focus) {
        cssStr += `
          &:focus {
          ${zxToCss(_focus)}
          }
        `
      }
      if (_focusVisible) {
        cssStr += `
          &:focus-visible {
          ${zxToCss(_focusVisible)}
          }
        `
      }
      if (_focusWithin) {
        cssStr += `
          &:focus-within {
          ${zxToCss(_focusWithin)}
          }
        `
      }
      if (_hover) {
        cssStr += `
          &:hover {
          ${zxToCss(_hover)}
          }
        `
      }
      if (_target) {
        cssStr += `
          &:target {
          ${zxToCss(_target)}
          }
        `
      }
      if (_visited) {
        cssStr += `
          &:visited {
          ${zxToCss(_visited)}
          }
        `
      }

      const hasMediaQuery = Object.values(_zx).some((v) => Array.isArray(v))
      // If has media query styles, use css class. Otherwise favor inline styles
      if (hasMediaQuery || cssStr) {
        cssStr = zxToCss(_zx) + cssStr
      } else {
        _zx = expandShorthandProps(_zx)
        rest.style = { ...rest.style, ..._zx } as CSSProperties
      }

      return createElement(Component, {
        ref,
        ...rest,
        className: classJoin(
          className,
          _css ? (_css.includes(':') ? css(_css) : _css) : undefined,
          cssStr ? css(cssStr) : undefined,
          props.className
        ),
      })
    })
    CStyled.toString = () => '.' + className
    return CStyled as unknown as SC<Parameters<C>[0]>
  }
}
