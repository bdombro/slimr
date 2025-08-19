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
  const trashgc: string[] = []

  md = md.trim().replace(/\n[ \t]+/gm, '\n') // trim indentation

  if (!md) return ''

  md = md.replace(/<(\/)?(script|style)>/gim, '&lt;$1$2&gt;') // Encode any script and style tags

  // an array to store the intermediate placeholders
  // Create keys and add chunks to it that we don't want mangle
  const placeholders: [key: string, value: string][] = []

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

  md = md
    .replace(/\n\n(\*\*\*+|---*|___*)$/gm, '\n<hr/>') // Horizontal rule/lines, i.e. *** --- ___
    .replace(/^###### (.*$)(\n*)/gm, '<h6>$1</h6>\n')
    .replace(/^##### (.*$)(\n*)/gm, '<h5>$1</h5>\n')
    .replace(/^#### (.*$)(\n*)/gm, '<h4>$1</h4>\n')
    .replace(/^### (.*$)(\n*)/gm, '<h3>$1</h3>\n')
    .replace(/^## (.*$)(\n*)/gm, '<h2>$1</h2>\n')
    .replace(/^# (.*$)(\n*)/gm, '<h1>$1</h1>\n')
    .replace(/^(.*$)\n===+\n\n*/gm, '<h1>$1</h1>\n') // alt h1
    .replace(/^(.*$)\n---+\n\n*/gm, '<h2>$1</h2>\n') // alt h2
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>') // blockquotes i.e. '> quote'
    // if a line ends with a space, replace with &nbsp;
    .replace(/ $/gm, '&nbsp;')
    .replace(/\*\*(.*?)\*\*/gm, '<b>$1</b>') // bold
    .replace(/\*(.*?)\*/gm, '<em>$1</em>') // italic
    .replace(/~~(.*?)~~/gm, '<strike>$1</strike>') // deleted text
    // images
    .replace(/!\[(.*?)\]\(([^ ]*)\)/gm, "<img alt='$1' src='$2'/>")
    .replace(
      /!\[(.*?)\]\(([^ ]*)( [('"][^)'"]+[)'"])*\)/gm,
      (_, ...args) =>
        `<img alt='${args[0]}' src='${args[1]}'${
          args[2] ? ` title='${args[2].slice(2, -1)}'` : ''
        }/>`
    )
    // links
    .replace(
      /\[(.*?)\]\(([^ ]*)( [('"][^)'"]+[)'"])*\)/gm,
      (_, ...args) =>
        `<a href='${args[1]}'${args[2] ? ` title='${args[2].slice(2, -1)}'` : ''}>${args[0]}</a>`
    )
    .replace(/([^ \n]+@[^. \n]+\.[^ \n]+)/gm, "<a href='mailto:$1'>$1</a>") // emails
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
    // unordered lists i.e. - listitem
    .replace(/\n\n+(- (.*))$/gm, '\n<ul>\n$1')
    .replace(/^(- (.*))\n\n/gm, '$1\n</ul>\n\n')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    // ordered lists i.e. 1. listitem
    .replace(/\n\n+(\d\. (.*))$/gm, '\n<ol>\n$1')
    .replace(/^(\d\. (.*))\n\n/gm, '$1\n</ol>\n\n')
    .replace(/^\d\. (.*)$/gm, '<li>$1</li>')

  // Trash collect
  for (const s of trashgc) {
    md = md.replace(s, '')
  }

  if (!md.endsWith('\n')) {
    md += '\n'
  }

  md = md
    .replace(/([\w '"])\n([\w '"])/gm, '$1 $2') // replace newlines between words with a space
    .replace(/^((\w|'|"|&|<b>|<s>|<a>|<a\s|<strong>|<strike>|<i>)[^\n]+)\n$/gm, '<p>$1</p>')

  // Add placeholders back
  for (const [key, value] of placeholders) {
    md = md.replace(key, value)
  }

  md = '\n' + md.trim() + '\n'

  return md
}
