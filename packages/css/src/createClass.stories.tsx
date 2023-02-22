import {css} from './index.js'

export default {
  title: '@slimr/css/createClass',
  component: css,
  tags: ['autodocs'],
}

/**
 * Create or retrieve a CSS class, cached by the CSS string. Also, notice the shorthand syntax support
 */
export function CreateClass() {
  return (
    <p
      className={css`
        c: blue;
      `}
    >
      This should be blue
    </p>
  )
}

/**
 * Upsert a CSS class which has responsive styles similar to [Chakra UI](https://chakra-ui.com/docs/features/responsive-styles)
 */
export function Responsive() {
  return (
    <p
      className={css`
        max-width: [100%, null, 200px];
      `}
    >
      This be max-width = 100% on mobile and 200px on desktop
    </p>
  )
}
