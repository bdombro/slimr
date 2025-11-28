/**
 * Converts a limited markdown subset to HTML
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
 * Common alternatives: snarkdown, markdown-it, marked
 *
 * @param md
 * A string containing valid markdown text
 *
 * @returns
 * A string of html
 *
 * @example
 * ```typescript
 * import { parse } from '@slimr/markdown'
 * const html = parse(`
 *  # ~~The Jungle~~Heaven
 *
 *  Welcome to ~~the jungle~~heaven, baby.
 * `)
 * ```
 */
export const parse = (md: string) => {
  // an array to store the intermediate placeholders
  // Create keys and add chunks to it that we don't want mangle
  const placeholders: [key: string, value: string][] = []
  // a temporary array to store reference links that we want to trash collect later
  const trashgc: string[] = []

  md = md.trim().replace(/\n[ \t]+/gm, '\n') // trim indentation

  if (!md) return ''

  while (!md.endsWith('\n\n')) {
    md += '\n'
  }

  // Encode any script and style tags
  md = md.replace(/<(\/)?(script|style)>/gim, '&lt;$1$2&gt;')

  // code blocks i.e. ```code```
  // transpile and remove before others to prevent interference
  md = md
    .replace(/```/g, 'ỻ') // intermediate placeholder
    .replace(/ỻ([^ỻ\n]*)ỻ/gm, (_, code) => `<code>${code}</code>`)
    .replace(/ỻ(.*)(\n*)([^ỻ]*)ỻ/gm, (_, ...args) => {
      let code = `<code${args[0] ? ` class="language-${args[0]}"` : ''} style="padding-top:0">${
        args[1] + args[2].replace(/&/g, '&amp').replace(/</g, '&lt').replace(/>/g, '&gt')
      }</code>`
      if (code.includes('\n')) {
        code = `<pre>${code}</pre>`
      }
      const key = 'ỻ' + placeholders.length
      placeholders.push([key, code])
      return key
    })

  // Hard line breaks (two spaces at end of line)
  // - concats two lines with a <br/>
  // - must come before handlers that wrap their children
  md = md.replace(/ {2}\n/g, '<br/>')

  // if a line ends with a space, replace with &nbsp;
  // - must come before handlers that wrap their children
  md = md.replace(/ $/gm, '&nbsp;')

  // Horizontal rule/lines (i.e. *** --- ___) -- must come before other syntax that uses * - _ to prevent interference
  md = md.replace(/\n\n(\*\*\*+|---*|___*)$/gm, '\n<hr/>\n')

  // Headings
  md = md
    .replace(/^###### (.*$)(\n*)/gm, '<h6>$1</h6>\n\n')
    .replace(/^##### (.*$)(\n*)/gm, '<h5>$1</h5>\n\n')
    .replace(/^#### (.*$)(\n*)/gm, '<h4>$1</h4>\n\n')
    .replace(/^### (.*$)(\n*)/gm, '<h3>$1</h3>\n\n')
    .replace(/^## (.*$)(\n*)/gm, '<h2>$1</h2>\n\n')
    .replace(/^# (.*$)(\n*)/gm, '<h1>$1</h1>\n\n')
    .replace(/^(.*$)\n===+\n\n*/gm, '<h1>$1</h1>\n\n') // alt h1
    .replace(/^(.*$)\n---+\n\n*/gm, '<h2>$1</h2>\n\n') // alt h2
    // blockquotes i.e. '> quote'
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')

  // Font styles
  md = md
    .replace(/\*\*(.*?)\*\*/gm, '<b>$1</b>') // bold
    .replace(/\*(.*?)\*/gm, '<i>$1</i>') // italic
    .replace(/~~(.*?)~~/gm, '<strike>$1</strike>') // deleted text

  // images
  md = md
    .replace(/!\[(.*?)\]\(([^ ]*)\)/gm, "<img alt='$1' src='$2'/>")
    .replace(
      /!\[(.*?)\]\(([^ ]*)( [('"][^)'"]+[)'"])*\)/gm,
      (_, ...args) =>
        `<img alt='${args[0]}' src='${args[1]}'${
          args[2] ? ` title='${args[2].slice(2, -1)}'` : ''
        }/>`
    )

  // links
  md = md
    // simple links
    .replace(
      /\[(.*?)\]\(([^ ]*)( [('"][^)'"]+[)'"])*\)/gm,
      (_, ...args) =>
        `<a href='${args[1]}'${args[2] ? ` title='${args[2].slice(2, -1)}'` : ''}>${args[0]}</a>`
    )
    // emails
    .replace(/([^ \n]+@[^. \n]+\.[^ \n]+)/gm, "<a href='mailto:$1'>$1</a>")
    // reference links
    .replace(/\[([^\]]+)\]\[([^\]]+)\]/gm, (_, ...args) => {
      const refValue = new RegExp('\\[' + args[1] + '\\]: ([^ \n]+)( [^\n]*)?\n', 'gim').exec(md)
      if (refValue !== null) {
        trashgc.push(refValue[0])
        return (
          '<a href="' +
          refValue[1] +
          '"' +
          (refValue[2] ? ` title=${refValue[2].trim().replace(/[()]/g, '"')}` : '') +
          '>' +
          args[0] +
          '</a>'
        )
      } else return _
    })

  // Unordered lists
  // add a blank line between list items if those items are using different list symbols -- to prevent interference
  md = md
    .replace(/(\n[-].+)(\n[+*])/gm, '$1\n$2')
    .replace(/(\n[*].+)(\n[-+])/gm, '$1\n$2')
    .replace(/(\n[+].+)(\n[-*])/gm, '$1\n$2')
  // convert to html
  md = md.replace(/(^|\n\n)((?:^[-+*] .+(?:\n|$))+)/gm, function (_, prefix, listBlock) {
    const items = listBlock.replace(/^[-+*] (.*)$/gm, '<li>$1</li>')
    return prefix + '<ul>\n' + items + '</ul>\n'
  })
  // unescape escaped list item markers
  md = md.replace(/\\([-+*])/g, '$1')

  // Ordered lists
  md = md.replace(/(^|\n\n)((?:^\d+\. .+(?:\n|$))+)/gm, function (_, prefix, listBlock) {
    const items = listBlock.replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
    return prefix + '<ol>\n' + items + '</ol>\n'
  })

  // Trash collect
  for (const s of trashgc) {
    md = md.replace(s, '')
  }

  md = md
    // wrap blocks which are not full width in <p> tags
    .split('\n\n')
    .map(block => {
      // if the block starts with any of these tags, return as is
      if (!block.trim() || /^(ỻ|<blockquote|<div|<h|<ul|<ol|<li|<img)/.test(block.trim())) {
        return block
      } else {
        return `<p>${block}</p>`
      }
    })
    .join('\n\n')

  // Add placeholders back
  for (const [key, value] of placeholders) {
    md = md.replace(key, value)
  }

  return md
}
