/**
 * All the shorthand props that can be used in the css prop
 */
export interface ShorthandProps {
  /** shorthand for css:align-items */
  ai?: string
  /** shorthand for css:border */
  b?: string | number
  /** shorthand for css:border-radius */
  br?: string | number
  /** shorthand for css:background */
  bg?: string
  /** shorthand for css:color */
  c?: string
  /** shorthand for css:display */
  d?: string
  /** shorthand for css:flex */
  f?: string
  /** shorthand for css:flex-direction */
  fd?: string
  /** shorthand for css:height */
  h?: number | string
  /** shorthand for css:inset */
  i?: number | string
  /** shorthand for css:justify-content */
  jc?: string
  /** shorthand for css:margin */
  m?: number | string
  /** shorthand for css:margin-left */
  ml?: number | string
  /** shorthand for css:margin-right */
  mr?: number | string
  /** shorthand for css:margin-top */
  mt?: number | string
  /** shorthand for css:margin-bottom */
  mb?: number | string
  /** shorthand for css:margin-top & margin-bottom */
  my?: number | string
  /** shorthand for css:margin-left & margin-right */
  mx?: number | string
  /** shorthand for css:max-width */
  maxW?: number | string
  /** shorthand for css:min-width */
  minW?: number | string
  /** shorthand for css:padding */
  p?: number | string
  /** shorthand for css:padding-left */
  pl?: number | string
  /** shorthand for css:padding-right */
  pr?: number | string
  /** shorthand for css:padding-top */
  pt?: number | string
  /** shorthand for css:padding-bottom */
  pb?: number | string
  /** shorthand for css:padding-top & padding-bottom */
  py?: number | string
  /** shorthand for css:padding-left & padding-right */
  px?: number | string
  /** shorthand for css:position */
  pos?: number | string
  /** shorthand for css:text-align */
  ta?: string
  /** shorthand for css:width */
  w?: number | string
  /** shorthand for css:z-index */
  z?: number | string
}

/**
 * Expand short-hand css props to full
 */
export function expandShorthands(css: string) {
  css = '\n' + css // inject a newline to make the regex easier
  // Handle 'mx', 'my', 'px', 'py'
  css = css
    .replace(/([mp])x:([^;]*)/g, '$1l:$2;\n$1r:$2')
    .replace(/([mp])y:([^;]*);/g, '$1t:$2;\n$1b:$2')
  Object.entries(shorthandPropsMap).forEach(([k, v]) => {
    css = css.replace(new RegExp(`([ \n\t;])${k}:`, 'g'), `$1${v}:`)
  })
  return css.trim()
}

/**
 * Map shorthand props to their full css prop
 */
export const shorthandPropsMap: Record<
  keyof Omit<ShorthandProps, 'mx' | 'my' | 'px' | 'py'>,
  string
> = {
  ai: 'align-items',
  b: 'border',
  br: 'border-radius',
  bg: 'background',
  c: 'color',
  d: 'display',
  f: 'flex',
  fd: 'flex-direction',
  i: 'inset',
  h: 'height',
  jc: 'justify-content',
  m: 'margin',
  ml: 'margin-left',
  mr: 'margin-right',
  mt: 'margin-top',
  mb: 'margin-bottom',
  maxW: 'max-width',
  minW: 'min-width',
  p: 'padding',
  pl: 'padding-left',
  pr: 'padding-right',
  pt: 'padding-top',
  pb: 'padding-bottom',
  pos: 'position',
  ta: 'text-align',
  w: 'width',
  z: 'z-index',
}
