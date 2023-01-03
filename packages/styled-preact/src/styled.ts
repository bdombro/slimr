/**
 * This file is identical to the react version (../react/styled.ts) except
 * for the import of react vs preact and forwardRef handling
 *
 * The guts should be kept 1-to-1 identical, so that it's easier to maintain
 */
import { FunctionalComponent as FC, h, JSX, RefObject } from 'preact'
import css, { classJoin, TemplateStringProps } from '@ustyle/css'

export { css }
export * from '@ustyle/css'

/**
 * A lightweight alternative to styled-components
 * @param function - a functional component to be styled; must accept a className prop
 * @returns a function that accepts a template string of css returns a functional component
 */
export default function styled<C extends FC<{ className: JSX.HTMLAttributes['className'] }>>(Component: C) {
  return (...p: TemplateStringProps) => {
    const className = css(...p)
    function CStyled(props: any) {
      const { css: _css, forwardRef, ref, ...rest } = props
      return h(Component, {
        ref: ref || forwardRef,
        forwardRef: ref || forwardRef,
        ...rest,
        className: classJoin(props.className, className, _css ? (_css.includes(':') ? css(_css) : _css) : undefined),
      })
    }
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
export type SC<T extends { className: JSX.HTMLAttributes['className'] }> = FC<T & SCProps>

export interface HtmlTagProps {
  a: JSX.HTMLAttributes<HTMLAnchorElement>
  abbr: JSX.HTMLAttributes<HTMLElement>
  address: JSX.HTMLAttributes<HTMLElement>
  area: JSX.HTMLAttributes<HTMLAreaElement>
  article: JSX.HTMLAttributes<HTMLElement>
  aside: JSX.HTMLAttributes<HTMLElement>
  audio: JSX.HTMLAttributes<HTMLAudioElement>
  b: JSX.HTMLAttributes<HTMLElement>
  big: JSX.HTMLAttributes<HTMLElement>
  blockquote: JSX.HTMLAttributes<HTMLQuoteElement>
  body: JSX.HTMLAttributes<HTMLBodyElement>
  br: JSX.HTMLAttributes<HTMLBRElement>
  button: JSX.HTMLAttributes<HTMLButtonElement>
  caption: JSX.HTMLAttributes<HTMLElement>
  cite: JSX.HTMLAttributes<HTMLElement>
  code: JSX.HTMLAttributes<HTMLElement>
  col: JSX.HTMLAttributes<HTMLTableColElement>
  colgroup: JSX.HTMLAttributes<HTMLTableColElement>
  dd: JSX.HTMLAttributes<HTMLElement>
  del: JSX.HTMLAttributes<HTMLModElement>
  details: JSX.HTMLAttributes<HTMLDetailsElement>
  dfn: JSX.HTMLAttributes<HTMLElement>
  dialog: JSX.HTMLAttributes<HTMLDialogElement>
  div: JSX.HTMLAttributes<HTMLDivElement>
  dl: JSX.HTMLAttributes<HTMLDListElement>
  dt: JSX.HTMLAttributes<HTMLElement>
  em: JSX.HTMLAttributes<HTMLElement>
  embed: JSX.HTMLAttributes<HTMLEmbedElement>
  fieldset: JSX.HTMLAttributes<HTMLFieldSetElement>
  figcaption: JSX.HTMLAttributes<HTMLElement>
  figure: JSX.HTMLAttributes<HTMLElement>
  footer: JSX.HTMLAttributes<HTMLElement>
  form: JSX.HTMLAttributes<HTMLFormElement>
  h1: JSX.HTMLAttributes<HTMLHeadingElement>
  h2: JSX.HTMLAttributes<HTMLHeadingElement>
  h3: JSX.HTMLAttributes<HTMLHeadingElement>
  h4: JSX.HTMLAttributes<HTMLHeadingElement>
  h5: JSX.HTMLAttributes<HTMLHeadingElement>
  h6: JSX.HTMLAttributes<HTMLHeadingElement>
  header: JSX.HTMLAttributes<HTMLElement>
  hgroup: JSX.HTMLAttributes<HTMLElement>
  hr: JSX.HTMLAttributes<HTMLHRElement>
  i: JSX.HTMLAttributes<HTMLElement>
  iframe: JSX.HTMLAttributes<HTMLIFrameElement>
  img: JSX.HTMLAttributes<HTMLImageElement>
  input: JSX.HTMLAttributes<HTMLInputElement>
  ins: JSX.HTMLAttributes<HTMLModElement>
  kbd: JSX.HTMLAttributes<HTMLElement>
  label: JSX.HTMLAttributes<HTMLLabelElement>
  legend: JSX.HTMLAttributes<HTMLLegendElement>
  li: JSX.HTMLAttributes<HTMLLIElement>
  main: JSX.HTMLAttributes<HTMLElement>
  map: JSX.HTMLAttributes<HTMLMapElement>
  mark: JSX.HTMLAttributes<HTMLElement>
  meter: JSX.HTMLAttributes<HTMLMeterElement>
  nav: JSX.HTMLAttributes<HTMLElement>
  object: JSX.HTMLAttributes<HTMLObjectElement>
  ol: JSX.HTMLAttributes<HTMLOListElement>
  optgroup: JSX.HTMLAttributes<HTMLOptGroupElement>
  option: JSX.HTMLAttributes<HTMLOptionElement>
  output: JSX.HTMLAttributes<HTMLOutputElement>
  p: JSX.HTMLAttributes<HTMLParagraphElement>
  picture: JSX.HTMLAttributes<HTMLElement>
  pre: JSX.HTMLAttributes<HTMLPreElement>
  progress: JSX.HTMLAttributes<HTMLProgressElement>
  q: JSX.HTMLAttributes<HTMLQuoteElement>
  rp: JSX.HTMLAttributes<HTMLElement>
  rt: JSX.HTMLAttributes<HTMLElement>
  ruby: JSX.HTMLAttributes<HTMLElement>
  s: JSX.HTMLAttributes<HTMLElement>
  samp: JSX.HTMLAttributes<HTMLElement>
  section: JSX.HTMLAttributes<HTMLElement>
  select: JSX.HTMLAttributes<HTMLSelectElement>
  small: JSX.HTMLAttributes<HTMLElement>
  span: JSX.HTMLAttributes<HTMLSpanElement>
  strong: JSX.HTMLAttributes<HTMLElement>
  sub: JSX.HTMLAttributes<HTMLElement>
  summary: JSX.HTMLAttributes<HTMLElement>
  sup: JSX.HTMLAttributes<HTMLElement>
  table: JSX.HTMLAttributes<HTMLTableElement>
  tbody: JSX.HTMLAttributes<HTMLTableSectionElement>
  td: JSX.HTMLAttributes<HTMLTableDataCellElement>
  textarea: JSX.HTMLAttributes<HTMLTextAreaElement>
  tfoot: JSX.HTMLAttributes<HTMLTableSectionElement>
  th: JSX.HTMLAttributes<HTMLTableHeaderCellElement>
  thead: JSX.HTMLAttributes<HTMLTableSectionElement>
  time: JSX.HTMLAttributes<HTMLTimeElement>
  tr: JSX.HTMLAttributes<HTMLTableRowElement>
  u: JSX.HTMLAttributes<HTMLElement>
  ul: JSX.HTMLAttributes<HTMLUListElement>
  var: JSX.HTMLAttributes<HTMLElement>
  video: JSX.HTMLAttributes<HTMLVideoElement>
}
