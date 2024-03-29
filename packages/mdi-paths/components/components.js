import {appendStyle} from '@slimr/util'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, {createElement, useEffect, useState} from 'react'

appendStyle({
  id: 'mdi',
  innerHTML: `@keyframes spin { to { transform: rotate(360deg); } } @keyframes spin-inverse { to { transform: rotate(-360deg); } }`,
})

/**
 * A component that lazily loads an icon using a cb that returns a promise.
 * The promise should resolve to an object with a `default` property = string
 * of an SVG's path `d` attribute. The 'd' attribute is the actual content of
 * an MDI svg.
 * 
 * For a list of available icons, see https://materialdesignicons.com/ and
 * remember to use uppercase first + camel-case for the icon name.
 * 
 * @example
 * ```tsx
 * <LazyIconSvg pathImporter={() => import('@slimr/mdi-paths/Home')} />
 * ```
 *
 * @param pathImporter A cb that returns a promise of an object with a `default` property = string of an SVG's path `d` attribute
 * @param IconSvg props excluding `d` and `path`
 */
export function LazyIconSvg({pathImporter, ...props}) {
  const [svgPath, setSvgPath] = useState(LazyIconSvg.cache[pathImporter] || '')
  useEffect(() => {
    if (svgPath) return
    pathImporter().then(module => {
      setSvgPath(module.default)
      LazyIconSvg.cache[pathImporter] = module.default
    })
  }, [])
  // return <IconSvg d={svgPath} {...props} />
  return createElement(IconSvg, {
    ...props,
    d: svgPath,
  })
}
LazyIconSvg.cache = {}

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
  ...props
}) {
  const style = {...props.style}
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

  // return (
  //   <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} {...props} style={style}>
  //     {path}
  //     {d && <path d={d} />}
  //   </svg>
  // )

  return createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: fill,
      ...props,
      style: style,
    },
    path,
    d ? createElement('path', {d}) : null
  )
}
