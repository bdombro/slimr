import React, { createElement } from 'react'

/**
 * A component that lazily loads an icon using a cb that returns a promise.
 * The promise should resolve to an object with a `default` property = string
 * of an SVG's path `d` attribute. The 'd' attribute is the actual content of
 * an MDI svg.
 *
 * @param pathImporter A cb that returns a promise of an object with a `default` property = string of an SVG's path `d` attribute
 * @param IconSvg props excluding `d` and `path`
 */
export function LazyIconSvg({ pathImporter, ...props }) {
  const isMounted = useMountedState()
  const [svgPath, setSvgPath] = useState('')
  useEffect(() => {
    pathImporter().then((module) => {
      if (isMounted()) setSvgPath(module.default)
    })
  }, [])
  // return <IconSvg d={svgPath} {...props} />
  return createElement(IconSvg, {
    ...props,
    d: svgPath,
  })
}

/**
 * A non-lazy icon component that renders an SVG with a path `d` attribute.
 */
export function IconSvg({
  d = '',
  path = '',
  size = 24,
  fill = 'currentColor',
  horizontal,
  vertical,
  rotate = 0,
  spin,
  spinInverse,
  style = {},
  ...props
}) {
  if (typeof style !== 'string') {
    style.verticalAlign = style.verticalAlign || 'middle'
    const transforms = style.transform ? [style.transform] : []
    if (horizontal) transforms.push('scaleX(-1)')
    if (vertical) transforms.push('scaleY(-1)')
    if (rotate !== 0) transforms.push(`rotate(${rotate}deg)`)
    if (transforms.length > 0) {
      style.transform = transforms.join(' ')
      style.transformOrigin = 'center'
    }
    if (spin) {
      const spinSec = spin === true || typeof spin !== 'number' ? 2 : spin
      style.animation = `spin${spinInverse ? '-inverse' : ''} linear ${Math.abs(spinSec)}s infinite`
      style.transformOrigin = 'center'
    }
  }

  return createElement('svg', {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: fill,
    ...props,
    style: style,
    children: [path, ...(d ? [createElement('path', { d })] : [])],
  })
}
