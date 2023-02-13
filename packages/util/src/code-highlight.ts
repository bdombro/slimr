/* eslint-disable @typescript-eslint/ban-ts-comment */
import hljs from 'highlight.js/lib/core'
// @ts-ignore
import bash from 'highlight.js/lib/languages/bash'
// @ts-ignore
import go from 'highlight.js/lib/languages/go'
// @ts-ignore
import java from 'highlight.js/lib/languages/java'
// @ts-ignore
import js from 'highlight.js/lib/languages/javascript'
// @ts-ignore
import json from 'highlight.js/lib/languages/json'
// @ts-ignore
import md from 'highlight.js/lib/languages/markdown'
// @ts-ignore
import py from 'highlight.js/lib/languages/python'
// @ts-ignore
import ruby from 'highlight.js/lib/languages/ruby'
// @ts-ignore
import rust from 'highlight.js/lib/languages/rust'
// @ts-ignore
import shell from 'highlight.js/lib/languages/shell'
// @ts-ignore
import swift from 'highlight.js/lib/languages/swift'
// @ts-ignore
import ts from 'highlight.js/lib/languages/typescript'
// @ts-ignore
import yaml from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('go', go)
hljs.registerLanguage('java', java)
hljs.registerLanguage('js', js)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', md)
hljs.registerLanguage('python', py)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('ts', ts)
hljs.registerLanguage('yaml', yaml)

/**
 * Highlight code elements using highlight.js
 */
export function highlightCodeElements() {
  // Github dark theme from style/github-dark.css
  const css = `
  pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}/*!
  */.hljs{color:#adbac7;background:#22272e}.hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#f47067}.hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#dcbdfb}.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable{color:#6cb6ff}.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#96d0ff}.hljs-built_in,.hljs-symbol{color:#f69d50}.hljs-code,.hljs-comment,.hljs-formula{color:#768390}.hljs-name,.hljs-quote,.hljs-selector-pseudo,.hljs-selector-tag{color:#8ddb8c}.hljs-subst{color:#adbac7}.hljs-section{color:#316dca;font-weight:700}.hljs-bullet{color:#eac55f}.hljs-emphasis{color:#adbac7;font-style:italic}.hljs-strong{color:#adbac7;font-weight:700}.hljs-addition{color:#b4f1b4;background-color:#1b4721}.hljs-deletion{color:#ffd8d3;background-color:#78191b}
  `

  if (!document.getElementById('highlight')) {
    document.head.appendChild(
      Object.assign(document.createElement('style'), {id: 'highlight', innerHTML: css})
    )
  }
  return hljs.highlightAll()
}
