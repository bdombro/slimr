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

this line will combine
with this line*
and this line + a space in between

this line ends with two spaces, so will combine  
with this line with a line break

**Bold** *Italic* ***Bold Italic*** ~~Strikethrough~~ ~~**Bold** in Strikethrough~~

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

- ul1li1
- ul1li2
- ul1li3

* ul2li1
* ul2li2

+ ul3li1
+ ul3li2

- ul4li1
+ ul5li1
* ul6li1

1. olli1
2. olli2
3. olli3

\\-\\+\\* escaped list symbols should be unescaped and interpretted as a non-list symbols

$ lines starting with a non-word symbol should be paragraphs

<script>This script tag is HTML encoded for security</script>

<style>This style tag is HTML encoded for security</style>
`
  const parsed = parse(markdown)
  // console.log(parsed)
  expect(parsed).toMatchSnapshot()
})
