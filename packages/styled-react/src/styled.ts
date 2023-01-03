/**
 * This file is nearly identical to the preact version (../preact/styled.ts) except
 * for the import of react vs preact and forwardRef handling
 *
 * The guts should be kept 1-to-1 identical, so that it's easier to maintain
 */
import { createElement as h, FC, forwardRef, HTMLAttributes, RefObject } from 'react'
import css, { classJoin, TemplateStringProps } from '@ustyle/css'

export { css }
export * from '@ustyle/css'

/**
 * A lightweight alternative to styled-components
 * @param function - a functional component to be styled; must accept a className prop
 * @returns a function that accepts a template string of css returns a functional component
 */
export default function styled<C extends FC<{ className: HTMLAttributes<any>['className'] }>>(Component: C) {
  return (...cssProps: TemplateStringProps) => {
    const className = css(...cssProps)
    const CStyled = forwardRef((props: any, ref) => {
      const { css: _css, forwardRef, ...rest } = props
      return h(Component, {
        ref: ref || forwardRef,
        forwardRef: ref || forwardRef,
        ...rest,
        className: classJoin(props.className, className, _css ? (_css.includes(':') ? css(_css) : _css) : undefined),
      })
    })
    CStyled.toString = () => '.' + className
    return CStyled as unknown as SC<Parameters<C>[0]>
  }
}

export type SCProps = {
  /** A string of css or classname to be added to the component */
  css?: string
  /** A ref to be passed down */
  forwardRef?: RefObject<any>
}
export type { FC }
/** Styled Component: Like FunctionalComponent but adds SCProps */
export type SC<T extends { className: HTMLAttributes<any>['className'] }> = FC<T & SCProps>

export type HtmlTagProps = JSX.IntrinsicElements
