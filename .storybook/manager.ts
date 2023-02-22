import {addons} from '@storybook/manager-api'

import Theme from './theme'

addons.setConfig({
  showPanel: false,
  showToolbar: false,
  theme: Theme,
})
