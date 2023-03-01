import {highlightCodeElements} from '@slimr/util'
import React, {memo} from 'react'

import {parse} from './parse.js'

/**
 * A component that displays markdown as html
 *
 * - headings, i.e. # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6
 * - alt H1 heading, i.e. H1\n===
 * - alt H2 heading, i.e. H1\n---
 * - Horizontal rule/lines, i.e. *** --- ___
 * - **bold**
 * - *italic*
 * - ~~strikethrough~~
 * - links, i.e. [Link](https://google.com)  [Link with title](https://google.com 'title')
 * - reference links, i.e. [link1-text][link1-ref]
 * - images, i.e. ![Image](https://google.com)  ![Image with title](https://google.com 'title')
 * - ordered and unordered lists up to one level. nesting not supported.
 * - code blocks
 * - Most HTML is passed through without modification, except scripts/style which will be HTML encoded
 *
 * @param applyCodeSyntaxHighlights
 * Whether to apply syntax highlighting to code blocks. Uses highlight.js
 * which is lazy loaded but HUGE (~20kb). So, if you don't need it, don't use it.
 *
 * @param src
 * A string containing markdown to be displayed
 *
 * @example
 * ```typescript
 * import { Markdown } from '@slimr/markdown'
 * function MyComponent() {
 *   return <Markdown src={`
 *     # ~~The Jungle~~Heaven
 *
 *     Welcome to ~~the jungle~~heaven, baby.
 *   `} />
 * }
 * ```
 */
export const Markdown = memo(function Markdown({
  /**
   * Whether to apply syntax highlighting to code blocks. Uses highlight.js
   * which is lazy loaded but HUGE. So, if you don't need it, don't use it.
   */
  applyCodeSyntaxHighlights = false,
  /** A string containing markdown to be displayed */
  src,
}: {
  applyCodeSyntaxHighlights?: boolean
  src: string
}) {
  const __html = parse(src)
  if (__html.includes('<pre><code') && applyCodeSyntaxHighlights) {
    highlightCodeElements()
  }
  return <div dangerouslySetInnerHTML={{__html}} />
})
