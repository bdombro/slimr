/**
 * This file is identical to the preact version (../preact/htmlTags.ts)
 * Should be kept 1-to-1 identical, so that it's easier to maintain
 */
import styled from './styled.js'
import * as htmlTags from './htmlTags.js'

export default Object.assign(styled, htmlTags)
export * from './styled.js'
export { htmlTags }
