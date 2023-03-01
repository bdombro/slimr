import {LazyIconSvg, LazyIconSvgProps} from '@slimr/mdi-paths/components'

const icons = {
  alert: () => import('@slimr/mdi-paths/AlertOutline'),
  close: () => import('@slimr/mdi-paths/Close'),
  error: () => import('@slimr/mdi-paths/AlertOctagonOutline'),
  info: () => import('@slimr/mdi-paths/InformationOutline'),
  success: () => import('@slimr/mdi-paths/CheckCircleOutline'),
} as const

export type IconKeys = keyof typeof icons
export type IconProps = Omit<LazyIconSvgProps, 'name' | 'pathImporter'> & {
  name: IconKeys
}
export type IconType = (props: IconProps) => JSX.Element

/**
 * A component that lazily loads an icon from Material Design Icons
 * by name. The names available are declared in the `icons` object above.
 */
export function Icon({name, ...props}: IconProps) {
  return <LazyIconSvg pathImporter={icons[name]} {...props} />
}
