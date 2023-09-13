import {LazyIconSvg, LazyIconSvgProps} from '@slimr/mdi-paths/components'
import {classJoin} from '@slimr/react'

// export {}

declare global {
  /**
   * A component that lazily loads an icon from Material Design Icons
   * by name. The names available are declared in the `icons` object in
   * the same file as Icon.
   */
  var Icon: typeof _Icon
  type IconKeys = keyof typeof _icons
  type IconProps = Omit<LazyIconSvgProps, 'name' | 'pathImporter'> & {
    name: IconKeys
  }

  var icons: typeof _icons
}

const _icons = {
  account: () => import('@slimr/mdi-paths/CardAccountDetailsOutline'),
  alert: () => import('@slimr/mdi-paths/AlertOutline'),
  arrowL: () => import('@slimr/mdi-paths/ArrowLeft'),
  arrowR: () => import('@slimr/mdi-paths/ArrowRight'),
  auth: () => import('@slimr/mdi-paths/ShieldAccountOutline'),
  building: () => import('@slimr/mdi-paths/OfficeBuildingMarkerOutline'),
  carrotUp: () => import('@slimr/mdi-paths/MenuUp'),
  carrotDown: () => import('@slimr/mdi-paths/MenuDown'),
  carrotLeft: () => import('@slimr/mdi-paths/MenuLeft'),
  carrotRight: () => import('@slimr/mdi-paths/MenuRight'),
  checkboxM: () => import('@slimr/mdi-paths/CheckboxMarked'),
  checkboxB: () => import('@slimr/mdi-paths/CheckboxBlankOutline'),
  chevronL2x: () => import('@slimr/mdi-paths/ChevronDoubleLeft'),
  chevronR2x: () => import('@slimr/mdi-paths/ChevronDoubleRight'),
  close: () => import('@slimr/mdi-paths/Close'),
  counter: () => import('@slimr/mdi-paths/Counter'),
  dotsV: () => import('@slimr/mdi-paths/DotsVertical'),
  error: () => import('@slimr/mdi-paths/AlertOctagonOutline'),
  home: () => import('@slimr/mdi-paths/HomeOutline'),
  info: () => import('@slimr/mdi-paths/InformationOutline'),
  login: () => import('@slimr/mdi-paths/LoginVariant'),
  logout: () => import('@slimr/mdi-paths/LogoutVariant'),
  mapPin: () => import('@slimr/mdi-paths/MapMarker'),
  menu: () => import('@slimr/mdi-paths/MenuOpen'),
  person: () => import('@slimr/mdi-paths/Account'),
  palette: () => import('@slimr/mdi-paths/PaletteOutline'),
  post: () => import('@slimr/mdi-paths/PostOutline'),
  // reactLogo: () => import('@slimr/mdi-paths/React'),
  roundedCornerInv: () => import('./RoundedCornerInverted'),
  search: () => import('@slimr/mdi-paths/Magnify'),
  support: () => import('@slimr/mdi-paths/Lifebuoy'),
  success: () => import('@slimr/mdi-paths/CheckCircleOutline'),
  tasks: () => import('@slimr/mdi-paths/OrderBoolAscendingVariant'),
} as const
globalThis.Icon = _Icon

/**
 * A component that lazily loads an icon from Material Design Icons
 * by name. The names available are declared in the `icons` object above.
 */
function _Icon({name, className, ...props}: IconProps) {
  return (
    <LazyIconSvg pathImporter={_icons[name]} className={classJoin('icon', className)} {...props} />
  )
}
globalThis.icons = _icons
