import {parse} from './parse.js'

it('parses correctly', () => {
  const markdown = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
this text should not interfere with the above


Alt-H1
=============

Alt-H2
-------------
this text should not interfere with the above

soft
return

**Bold** *Italic* ~~Strikethrough~~

[Link](https://google.com)  [Link with title](https://google.com 'title') [@not-an-email](http://google.com)

![Image](https://google.com)  ![Image with title](https://google.com 'title')

<img src="https://google.com" alt="alt" title="title" />

<div>
  <p>
    Most html is left alone.
  </p>
</div>

email@email.com notemail@emailcom email@email.com


*****

*****

-----

_____
this text should not interfere with the above

> Blockquote

\`\`\`
// unknown
multi
\`line\`
generic code
\`\`\`

\`\`\`bash
# bash
multi
\`line\`
bash code
\`\`\`

Here is \`\`\`Inline Code\`\`\`.

Reference links [link1-text][link1] [link2-text][link2] [link3-text][link3]

[link1]: /link1
[link2]: /link2 'title2'
[link3]: /link3 (title3)

- li1
- li2
- li3

1. li4
2. li5
3. li6

<script>This script tag is HTML encoded for security</script>

<style>This style tag is HTML encoded for security</style>
`
  const parsed = parse(markdown)
  // console.log(parsed)
  expect(parsed).toMatchSnapshot()
})
