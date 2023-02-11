interface LazyIconSvgProps extends Omit<IconSvgProps, 'd' | 'path'> {
  /**
   * A cb that returns a promise of an object with a `default` property = string
   * of an SVG's path `d` attribute. The 'd' attribute is the actual content of
   * an MDI svg.
   *
   * @example
   * ```js
   * () => import('@iconify/icons-mdi/home')
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pathImporter: () => Promise<any> // Like () => import('@iconify/icons-mdi/home')
}

// Enhanced svg element
interface IconSvgProps extends Omit<JSX.IntrinsicElements['svg'], 'size'> {
  size?: number | string // Set width and height in one prop
  horizontal?: boolean // flip horizontally
  vertical?: boolean // flip vertically
  rotate?: number // rotate degrees
  path?: string // the path part of the svg
  spin?: boolean | number // spin the svg # seconds per spin. Default = 2
  spinInverse?: boolean // inverse the spin
}

/**
 * A component that lazily loads an icon using a cb that returns a promise.
 * The promise should resolve to an object with a `default` property = string
 * of an SVG's path `d` attribute. The 'd' attribute is the actual content of
 * an MDI svg.
 *
 * @param pathImporter A cb that returns a promise of an object with a `default` property = string of an SVG's path `d` attribute
 * @param IconSvg props excluding `d` and `path`
 */
export function LazyIconSvg(p: LazyIconSvgProps): JSX.Element

/**
 * A non-lazy icon component that renders an SVG with a path `d` attribute.
 */
export function IconSvg(p: IconSvgProps): JSX.Element
