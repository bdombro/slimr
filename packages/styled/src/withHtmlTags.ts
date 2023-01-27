import { FC } from 'react'
import { TemplateStringProps } from '@ustyle/css'
import styled from './index.js'

export * from './index.js'

/** Shorthand type */
type unk = unknown
/** Shorthand type */
type TSP = TemplateStringProps
/** Shorthand type */
type HTP = JSX.IntrinsicElements

export default Object.assign(styled, {
  /** creates a 'a' component with css applied */
  a: (...p: TSP) => styled('a' as unk as FC<HTP['a']>)(...p),
  /** creates a 'abbr' component with css applied */
  abbr: (...p: TSP) => styled('abbr' as unk as FC<HTP['abbr']>)(...p),
  /** creates a 'address' component with css applied */
  address: (...p: TSP) => styled('address' as unk as FC<HTP['address']>)(...p),
  /** creates a 'area' component with css applied */
  area: (...p: TSP) => styled('area' as unk as FC<HTP['area']>)(...p),
  /** creates a 'article' component with css applied */
  article: (...p: TSP) => styled('article' as unk as FC<HTP['article']>)(...p),
  /** creates a 'aside' component with css applied */
  aside: (...p: TSP) => styled('aside' as unk as FC<HTP['aside']>)(...p),
  /** creates a 'audio' component with css applied */
  audio: (...p: TSP) => styled('audio' as unk as FC<HTP['audio']>)(...p),
  /** creates a 'b' component with css applied */
  b: (...p: TSP) => styled('b' as unk as FC<HTP['b']>)(...p),
  /** creates a 'big' component with css applied; Deprecated so left out */
  // big: (...p: TSP) => styled('big' as unk as FC<HTP['big']>)(...p),
  /** creates a 'blockquote' component with css applied */
  blockquote: (...p: TSP) => styled('blockquote' as unk as FC<HTP['blockquote']>)(...p),
  /** creates a 'body' component with css applied; omitted bc doesnt seem useful */
  // body: (...p: TSP) => styled('body' as unk as FC<HTP['body']>)(...p),
  /** creates a 'br' component with css applied; omitted bc doesnt seem useful */
  br: (...p: TSP) => styled('br' as unk as FC<HTP['br']>)(...p),
  /** creates a 'button' component with css applied */
  button: (...p: TSP) => styled('button' as unk as FC<HTP['button']>)(...p),
  /** creates a 'caption' component with css applied */
  caption: (...p: TSP) => styled('caption' as unk as FC<HTP['caption']>)(...p),
  /** creates a 'cite' component with css applied */
  cite: (...p: TSP) => styled('cite' as unk as FC<HTP['cite']>)(...p),
  /** creates a 'code' component with css applied */
  code: (...p: TSP) => styled('code' as unk as FC<HTP['code']>)(...p),
  /** creates a 'col' component with css applied */
  col: (...p: TSP) => styled('col' as unk as FC<HTP['col']>)(...p),
  /** creates a 'colgroup' component with css applied */
  colgroup: (...p: TSP) => styled('colgroup' as unk as FC<HTP['colgroup']>)(...p),
  /** creates a 'dd' component with css applied */
  dd: (...p: TSP) => styled('dd' as unk as FC<HTP['dd']>)(...p),
  /** creates a 'del' component with css applied */
  del: (...p: TSP) => styled('del' as unk as FC<HTP['del']>)(...p),
  /** creates a 'details' component with css applied */
  details: (...p: TSP) => styled('details' as unk as FC<HTP['details']>)(...p),
  /** creates a 'dfn' component with css applied */
  dfn: (...p: TSP) => styled('dfn' as unk as FC<HTP['dfn']>)(...p),
  /** creates a 'dialog' component with css applied */
  dialog: (...p: TSP) => styled('dialog' as unk as FC<HTP['dialog']>)(...p),
  /** creates a 'div' component with css applied */
  div: (...p: TSP) => styled('div' as unk as FC<HTP['div']>)(...p),
  /** creates a 'dl' component with css applied */
  dl: (...p: TSP) => styled('dl' as unk as FC<HTP['dl']>)(...p),
  /** creates a 'dt' component with css applied */
  dt: (...p: TSP) => styled('dt' as unk as FC<HTP['dt']>)(...p),
  /** creates a 'em' component with css applied */
  em: (...p: TSP) => styled('em' as unk as FC<HTP['em']>)(...p),
  /** creates a 'embed' component with css applied */
  embed: (...p: TSP) => styled('embed' as unk as FC<HTP['embed']>)(...p),
  /** creates a 'fieldset' component with css applied */
  fieldset: (...p: TSP) => styled('fieldset' as unk as FC<HTP['fieldset']>)(...p),
  /** creates a 'figcaption' component with css applied */
  figcaption: (...p: TSP) => styled('figcaption' as unk as FC<HTP['figcaption']>)(...p),
  /** creates a 'figure' component with css applied */
  figure: (...p: TSP) => styled('figure' as unk as FC<HTP['figure']>)(...p),
  /** creates a 'footer' component with css applied */
  footer: (...p: TSP) => styled('footer' as unk as FC<HTP['footer']>)(...p),
  /** creates a 'form' component with css applied */
  form: (...p: TSP) => styled('form' as unk as FC<HTP['form']>)(...p),
  /** creates a 'h1' component with css applied */
  h1: (...p: TSP) => styled('h1' as unk as FC<HTP['h1']>)(...p),
  /** creates a 'h2' component with css applied */
  h2: (...p: TSP) => styled('h2' as unk as FC<HTP['h2']>)(...p),
  /** creates a 'h3' component with css applied */
  h3: (...p: TSP) => styled('h3' as unk as FC<HTP['h3']>)(...p),
  /** creates a 'h4' component with css applied */
  h4: (...p: TSP) => styled('h4' as unk as FC<HTP['h4']>)(...p),
  /** creates a 'h5' component with css applied */
  h5: (...p: TSP) => styled('h5' as unk as FC<HTP['h5']>)(...p),
  /** creates a 'h6' component with css applied */
  h6: (...p: TSP) => styled('h6' as unk as FC<HTP['h6']>)(...p),
  /** creates a 'header' component with css applied */
  header: (...p: TSP) => styled('header' as unk as FC<HTP['header']>)(...p),
  /** creates a 'hgroup' component with css applied */
  hgroup: (...p: TSP) => styled('hgroup' as unk as FC<HTP['hgroup']>)(...p),
  /** creates a 'hr' component with css applied */
  hr: (...p: TSP) => styled('hr' as unk as FC<HTP['hr']>)(...p),
  /** creates a 'i' component with css applied */
  i: (...p: TSP) => styled('i' as unk as FC<HTP['i']>)(...p),
  /** creates a 'iframe' component with css applied */
  iframe: (...p: TSP) => styled('iframe' as unk as FC<HTP['iframe']>)(...p),
  /** creates a 'img' component with css applied */
  img: (...p: TSP) => styled('img' as unk as FC<HTP['img']>)(...p),
  /** creates a 'input' component with css applied */
  input: (...p: TSP) => styled('input' as unk as FC<HTP['input']>)(...p),
  /** creates a 'ins' component with css applied */
  ins: (...p: TSP) => styled('ins' as unk as FC<HTP['ins']>)(...p),
  /** creates a 'kbd' component with css applied */
  kbd: (...p: TSP) => styled('kbd' as unk as FC<HTP['kbd']>)(...p),
  /** creates a 'label' component with css applied */
  label: (...p: TSP) => styled('label' as unk as FC<HTP['label']>)(...p),
  /** creates a 'legend' component with css applied */
  legend: (...p: TSP) => styled('legend' as unk as FC<HTP['legend']>)(...p),
  /** creates a 'li' component with css applied */
  li: (...p: TSP) => styled('li' as unk as FC<HTP['li']>)(...p),
  /** creates a 'main' component with css applied */
  main: (...p: TSP) => styled('main' as unk as FC<HTP['main']>)(...p),
  /** creates a 'map' component with css applied */
  map: (...p: TSP) => styled('map' as unk as FC<HTP['map']>)(...p),
  /** creates a 'mark' component with css applied */
  mark: (...p: TSP) => styled('mark' as unk as FC<HTP['mark']>)(...p),
  /** creates a 'meter' component with css applied */
  meter: (...p: TSP) => styled('meter' as unk as FC<HTP['meter']>)(...p),
  /** creates a 'nav' component with css applied */
  nav: (...p: TSP) => styled('nav' as unk as FC<HTP['nav']>)(...p),
  /** creates a 'object' component with css applied */
  object: (...p: TSP) => styled('object' as unk as FC<HTP['object']>)(...p),
  /** creates a 'ol' component with css applied */
  ol: (...p: TSP) => styled('ol' as unk as FC<HTP['ol']>)(...p),
  /** creates a 'optgroup' component with css applied */
  optgroup: (...p: TSP) => styled('optgroup' as unk as FC<HTP['optgroup']>)(...p),
  /** creates a 'option' component with css applied */
  option: (...p: TSP) => styled('option' as unk as FC<HTP['option']>)(...p),
  /** creates a 'output' component with css applied */
  output: (...p: TSP) => styled('output' as unk as FC<HTP['output']>)(...p),
  /** creates a 'p' component with css applied */
  p: (...p: TSP) => styled('p' as unk as FC<HTP['p']>)(...p),
  /** creates a 'picture' component with css applied */
  picture: (...p: TSP) => styled('picture' as unk as FC<HTP['picture']>)(...p),
  /** creates a 'pre' component with css applied */
  pre: (...p: TSP) => styled('pre' as unk as FC<HTP['pre']>)(...p),
  /** creates a 'progress' component with css applied */
  progress: (...p: TSP) => styled('progress' as unk as FC<HTP['progress']>)(...p),
  /** creates a 'q' component with css applied */
  q: (...p: TSP) => styled('q' as unk as FC<HTP['q']>)(...p),
  /** creates a 'rp' component with css applied */
  rp: (...p: TSP) => styled('rp' as unk as FC<HTP['rp']>)(...p),
  /** creates a 'rt' component with css applied */
  rt: (...p: TSP) => styled('rt' as unk as FC<HTP['rt']>)(...p),
  /** creates a 'ruby' component with css applied */
  ruby: (...p: TSP) => styled('ruby' as unk as FC<HTP['ruby']>)(...p),
  /** creates a 's' component with css applied */
  s: (...p: TSP) => styled('s' as unk as FC<HTP['s']>)(...p),
  /** creates a 'samp' component with css applied */
  samp: (...p: TSP) => styled('samp' as unk as FC<HTP['samp']>)(...p),
  /** creates a 'section' component with css applied */
  section: (...p: TSP) => styled('section' as unk as FC<HTP['section']>)(...p),
  /** creates a 'select' component with css applied */
  select: (...p: TSP) => styled('select' as unk as FC<HTP['select']>)(...p),
  /** creates a 'small' component with css applied */
  small: (...p: TSP) => styled('small' as unk as FC<HTP['small']>)(...p),
  /** creates a 'span' component with css applied */
  span: (...p: TSP) => styled('span' as unk as FC<HTP['span']>)(...p),
  /** creates a 'strong' component with css applied */
  strong: (...p: TSP) => styled('strong' as unk as FC<HTP['strong']>)(...p),
  /** creates a 'sub' component with css applied */
  sub: (...p: TSP) => styled('sub' as unk as FC<HTP['sub']>)(...p),
  /** creates a 'summary' component with css applied */
  summary: (...p: TSP) => styled('summary' as unk as FC<HTP['summary']>)(...p),
  /** creates a 'sup' component with css applied */
  sup: (...p: TSP) => styled('sup' as unk as FC<HTP['sup']>)(...p),
  /** creates a 'table' component with css applied */
  table: (...p: TSP) => styled('table' as unk as FC<HTP['table']>)(...p),
  /** creates a 'tbody' component with css applied */
  tbody: (...p: TSP) => styled('tbody' as unk as FC<HTP['tbody']>)(...p),
  /** creates a 'td' component with css applied */
  td: (...p: TSP) => styled('td' as unk as FC<HTP['td']>)(...p),
  /** creates a 'textarea' component with css applied */
  textarea: (...p: TSP) => styled('textarea' as unk as FC<HTP['textarea']>)(...p),
  /** creates a 'tfoot' component with css applied */
  tfoot: (...p: TSP) => styled('tfoot' as unk as FC<HTP['tfoot']>)(...p),
  /** creates a 'th' component with css applied */
  th: (...p: TSP) => styled('th' as unk as FC<HTP['th']>)(...p),
  /** creates a 'thead' component with css applied */
  thead: (...p: TSP) => styled('thead' as unk as FC<HTP['thead']>)(...p),
  /** creates a 'time' component with css applied */
  time: (...p: TSP) => styled('time' as unk as FC<HTP['time']>)(...p),
  /** creates a 'tr' component with css applied */
  tr: (...p: TSP) => styled('tr' as unk as FC<HTP['tr']>)(...p),
  /** creates a 'u' component with css applied */
  u: (...p: TSP) => styled('u' as unk as FC<HTP['u']>)(...p),
  /** creates a 'ul' component with css applied */
  ul: (...p: TSP) => styled('ul' as unk as FC<HTP['ul']>)(...p),
  /** creates a 'video' component with css applied */
  video: (...p: TSP) => styled('video' as unk as FC<HTP['video']>)(...p),
})
