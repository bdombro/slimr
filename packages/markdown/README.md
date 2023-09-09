# 🪶 @slimr/markdown [![npm package](https://img.shields.io/npm/v/@slimr/markdown.svg?style=flat-square)](https://npmjs.org/package/@slimr/markdown)

A tiny markdown parser and react component

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

## API

### parse

Converts a limited markdown subset to HTML

- 2Kb zipped, 1kb when bundled with other code
- ...is very small relatively speaking
- Keeps bundle small by clever coding and not supporting every markdown feature

Supported Syntax

- headings, i.e. # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6
- alt H1 heading, i.e. H1\n===
- alt H2 heading, i.e. H1\n---
- Horizontal rule/lines, i.e. \*\*\* --- \_\_\_
- **bold**
- _italic_
- ~~strikethrough~~
- links, i.e. [Link](https://google.com) [Link with title](https://google.com 'title')
- reference links, i.e. [link1-text][link1-ref]
- images, i.e. ![Image](https://google.com) ![Image with title](https://google.com 'title')
- ordered and unordered lists up to one level. nesting not supported.
- code blocks
- Most HTML is passed through without modification, except scripts/style which will be HTML encoded

```typescript
import {parse} from '@slimr/markdown'

const html = parse(`
  # ~~The Jungle~~Heaven

  Welcome to ~~the jungle~~heaven, baby.
`)
```

### Markdown

A component that displays markdown as html, using `src/parse` for conversion

Paremeters:

- `applyCodeSyntaxHighlights`: Whether to apply syntax highlighting to code blocks. Uses highlight.js which is lazy loaded but HUGE (~20kb). So, if you don't need it, don't use it.
- `src`: A string containing markdown to be displayed

```typescript
import {Markdown} from '@slimr/markdown'

function MyComponent() {
  return (
    <Markdown
      src={`
    # ~~The Jungle~~Heaven

    Welcome to ~~the jungle~~heaven, baby.
  `}
    />
  )
}
```
