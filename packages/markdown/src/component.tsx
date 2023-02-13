import {highlightCodeElements} from '@slimr/util'
import React, {memo} from 'react'

import {parse} from './parse.js'

/**
 * Displays markdown
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
