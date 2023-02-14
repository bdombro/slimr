import {TemplateStringProps} from '@slimr/css'

import {FC} from 'react'

import {styledBase as s} from './core.js'

/** Shorthand type */
type unk = unknown
/** Shorthand type */
type TSP = TemplateStringProps
/** Shorthand type */
type HTP = JSX.IntrinsicElements

export const styled = Object.assign(s, {
  /** creates a 'a' component with css applied */
  a: (...p: TSP) => s('a' as unk as FC<HTP['a']>)(...p),
  /** creates a 'abbr' component with css applied */
  abbr: (...p: TSP) => s('abbr' as unk as FC<HTP['abbr']>)(...p),
  /** creates a 'address' component with css applied */
  address: (...p: TSP) => s('address' as unk as FC<HTP['address']>)(...p),
  /** creates a 'area' component with css applied */
  area: (...p: TSP) => s('area' as unk as FC<HTP['area']>)(...p),
  /** creates a 'article' component with css applied */
  article: (...p: TSP) => s('article' as unk as FC<HTP['article']>)(...p),
  /** creates a 'aside' component with css applied */
  aside: (...p: TSP) => s('aside' as unk as FC<HTP['aside']>)(...p),
  /** creates a 'audio' component with css applied */
  audio: (...p: TSP) => s('audio' as unk as FC<HTP['audio']>)(...p),
  /** creates a 'b' component with css applied */
  b: (...p: TSP) => s('b' as unk as FC<HTP['b']>)(...p),
  /** creates a 'big' component with css applied; Deprecated so left out */
  // big: (...p: TSP) => styled('big' as unk as FC<HTP['big']>)(...p),
  /** creates a 'blockquote' component with css applied */
  blockquote: (...p: TSP) => s('blockquote' as unk as FC<HTP['blockquote']>)(...p),
  /** creates a 'body' component with css applied; omitted bc doesnt seem useful */
  // body: (...p: TSP) => styled('body' as unk as FC<HTP['body']>)(...p),
  /** creates a 'br' component with css applied; omitted bc doesnt seem useful */
  br: (...p: TSP) => s('br' as unk as FC<HTP['br']>)(...p),
  /** creates a 'button' component with css applied */
  button: (...p: TSP) => s('button' as unk as FC<HTP['button']>)(...p),
  /** creates a 'caption' component with css applied */
  caption: (...p: TSP) => s('caption' as unk as FC<HTP['caption']>)(...p),
  /** creates a 'cite' component with css applied */
  cite: (...p: TSP) => s('cite' as unk as FC<HTP['cite']>)(...p),
  /** creates a 'code' component with css applied */
  code: (...p: TSP) => s('code' as unk as FC<HTP['code']>)(...p),
  /** creates a 'col' component with css applied */
  col: (...p: TSP) => s('col' as unk as FC<HTP['col']>)(...p),
  /** creates a 'colgroup' component with css applied */
  colgroup: (...p: TSP) => s('colgroup' as unk as FC<HTP['colgroup']>)(...p),
  /** creates a 'dd' component with css applied */
  dd: (...p: TSP) => s('dd' as unk as FC<HTP['dd']>)(...p),
  /** creates a 'del' component with css applied */
  del: (...p: TSP) => s('del' as unk as FC<HTP['del']>)(...p),
  /** creates a 'details' component with css applied */
  details: (...p: TSP) => s('details' as unk as FC<HTP['details']>)(...p),
  /** creates a 'dfn' component with css applied */
  dfn: (...p: TSP) => s('dfn' as unk as FC<HTP['dfn']>)(...p),
  /** creates a 'dialog' component with css applied */
  dialog: (...p: TSP) => s('dialog' as unk as FC<HTP['dialog']>)(...p),
  /** creates a 'div' component with css applied */
  div: (...p: TSP) => s('div' as unk as FC<HTP['div']>)(...p),
  /** creates a 'dl' component with css applied */
  dl: (...p: TSP) => s('dl' as unk as FC<HTP['dl']>)(...p),
  /** creates a 'dt' component with css applied */
  dt: (...p: TSP) => s('dt' as unk as FC<HTP['dt']>)(...p),
  /** creates a 'em' component with css applied */
  em: (...p: TSP) => s('em' as unk as FC<HTP['em']>)(...p),
  /** creates a 'embed' component with css applied */
  embed: (...p: TSP) => s('embed' as unk as FC<HTP['embed']>)(...p),
  /** creates a 'fieldset' component with css applied */
  fieldset: (...p: TSP) => s('fieldset' as unk as FC<HTP['fieldset']>)(...p),
  /** creates a 'figcaption' component with css applied */
  figcaption: (...p: TSP) => s('figcaption' as unk as FC<HTP['figcaption']>)(...p),
  /** creates a 'figure' component with css applied */
  figure: (...p: TSP) => s('figure' as unk as FC<HTP['figure']>)(...p),
  /** creates a 'footer' component with css applied */
  footer: (...p: TSP) => s('footer' as unk as FC<HTP['footer']>)(...p),
  /** creates a 'form' component with css applied */
  form: (...p: TSP) => s('form' as unk as FC<HTP['form']>)(...p),
  /** creates a 'h1' component with css applied */
  h1: (...p: TSP) => s('h1' as unk as FC<HTP['h1']>)(...p),
  /** creates a 'h2' component with css applied */
  h2: (...p: TSP) => s('h2' as unk as FC<HTP['h2']>)(...p),
  /** creates a 'h3' component with css applied */
  h3: (...p: TSP) => s('h3' as unk as FC<HTP['h3']>)(...p),
  /** creates a 'h4' component with css applied */
  h4: (...p: TSP) => s('h4' as unk as FC<HTP['h4']>)(...p),
  /** creates a 'h5' component with css applied */
  h5: (...p: TSP) => s('h5' as unk as FC<HTP['h5']>)(...p),
  /** creates a 'h6' component with css applied */
  h6: (...p: TSP) => s('h6' as unk as FC<HTP['h6']>)(...p),
  /** creates a 'header' component with css applied */
  header: (...p: TSP) => s('header' as unk as FC<HTP['header']>)(...p),
  /** creates a 'hgroup' component with css applied */
  hgroup: (...p: TSP) => s('hgroup' as unk as FC<HTP['hgroup']>)(...p),
  /** creates a 'hr' component with css applied */
  hr: (...p: TSP) => s('hr' as unk as FC<HTP['hr']>)(...p),
  /** creates a 'i' component with css applied */
  i: (...p: TSP) => s('i' as unk as FC<HTP['i']>)(...p),
  /** creates a 'iframe' component with css applied */
  iframe: (...p: TSP) => s('iframe' as unk as FC<HTP['iframe']>)(...p),
  /** creates a 'img' component with css applied */
  img: (...p: TSP) => s('img' as unk as FC<HTP['img']>)(...p),
  /** creates a 'input' component with css applied */
  input: (...p: TSP) => s('input' as unk as FC<HTP['input']>)(...p),
  /** creates a 'ins' component with css applied */
  ins: (...p: TSP) => s('ins' as unk as FC<HTP['ins']>)(...p),
  /** creates a 'kbd' component with css applied */
  kbd: (...p: TSP) => s('kbd' as unk as FC<HTP['kbd']>)(...p),
  /** creates a 'label' component with css applied */
  label: (...p: TSP) => s('label' as unk as FC<HTP['label']>)(...p),
  /** creates a 'legend' component with css applied */
  legend: (...p: TSP) => s('legend' as unk as FC<HTP['legend']>)(...p),
  /** creates a 'li' component with css applied */
  li: (...p: TSP) => s('li' as unk as FC<HTP['li']>)(...p),
  /** creates a 'main' component with css applied */
  main: (...p: TSP) => s('main' as unk as FC<HTP['main']>)(...p),
  /** creates a 'map' component with css applied */
  map: (...p: TSP) => s('map' as unk as FC<HTP['map']>)(...p),
  /** creates a 'mark' component with css applied */
  mark: (...p: TSP) => s('mark' as unk as FC<HTP['mark']>)(...p),
  /** creates a 'meter' component with css applied */
  meter: (...p: TSP) => s('meter' as unk as FC<HTP['meter']>)(...p),
  /** creates a 'nav' component with css applied */
  nav: (...p: TSP) => s('nav' as unk as FC<HTP['nav']>)(...p),
  /** creates a 'object' component with css applied */
  object: (...p: TSP) => s('object' as unk as FC<HTP['object']>)(...p),
  /** creates a 'ol' component with css applied */
  ol: (...p: TSP) => s('ol' as unk as FC<HTP['ol']>)(...p),
  /** creates a 'optgroup' component with css applied */
  optgroup: (...p: TSP) => s('optgroup' as unk as FC<HTP['optgroup']>)(...p),
  /** creates a 'option' component with css applied */
  option: (...p: TSP) => s('option' as unk as FC<HTP['option']>)(...p),
  /** creates a 'output' component with css applied */
  output: (...p: TSP) => s('output' as unk as FC<HTP['output']>)(...p),
  /** creates a 'p' component with css applied */
  p: (...p: TSP) => s('p' as unk as FC<HTP['p']>)(...p),
  /** creates a 'picture' component with css applied */
  picture: (...p: TSP) => s('picture' as unk as FC<HTP['picture']>)(...p),
  /** creates a 'pre' component with css applied */
  pre: (...p: TSP) => s('pre' as unk as FC<HTP['pre']>)(...p),
  /** creates a 'progress' component with css applied */
  progress: (...p: TSP) => s('progress' as unk as FC<HTP['progress']>)(...p),
  /** creates a 'q' component with css applied */
  q: (...p: TSP) => s('q' as unk as FC<HTP['q']>)(...p),
  /** creates a 'rp' component with css applied */
  rp: (...p: TSP) => s('rp' as unk as FC<HTP['rp']>)(...p),
  /** creates a 'rt' component with css applied */
  rt: (...p: TSP) => s('rt' as unk as FC<HTP['rt']>)(...p),
  /** creates a 'ruby' component with css applied */
  ruby: (...p: TSP) => s('ruby' as unk as FC<HTP['ruby']>)(...p),
  /** creates a 's' component with css applied */
  s: (...p: TSP) => s('s' as unk as FC<HTP['s']>)(...p),
  /** creates a 'samp' component with css applied */
  samp: (...p: TSP) => s('samp' as unk as FC<HTP['samp']>)(...p),
  /** creates a 'section' component with css applied */
  section: (...p: TSP) => s('section' as unk as FC<HTP['section']>)(...p),
  /** creates a 'select' component with css applied */
  select: (...p: TSP) => s('select' as unk as FC<HTP['select']>)(...p),
  /** creates a 'small' component with css applied */
  small: (...p: TSP) => s('small' as unk as FC<HTP['small']>)(...p),
  /** creates a 'span' component with css applied */
  span: (...p: TSP) => s('span' as unk as FC<HTP['span']>)(...p),
  /** creates a 'strong' component with css applied */
  strong: (...p: TSP) => s('strong' as unk as FC<HTP['strong']>)(...p),
  /** creates a 'sub' component with css applied */
  sub: (...p: TSP) => s('sub' as unk as FC<HTP['sub']>)(...p),
  /** creates a 'summary' component with css applied */
  summary: (...p: TSP) => s('summary' as unk as FC<HTP['summary']>)(...p),
  /** creates a 'sup' component with css applied */
  sup: (...p: TSP) => s('sup' as unk as FC<HTP['sup']>)(...p),
  /** creates a 'table' component with css applied */
  table: (...p: TSP) => s('table' as unk as FC<HTP['table']>)(...p),
  /** creates a 'tbody' component with css applied */
  tbody: (...p: TSP) => s('tbody' as unk as FC<HTP['tbody']>)(...p),
  /** creates a 'td' component with css applied */
  td: (...p: TSP) => s('td' as unk as FC<HTP['td']>)(...p),
  /** creates a 'textarea' component with css applied */
  textarea: (...p: TSP) => s('textarea' as unk as FC<HTP['textarea']>)(...p),
  /** creates a 'tfoot' component with css applied */
  tfoot: (...p: TSP) => s('tfoot' as unk as FC<HTP['tfoot']>)(...p),
  /** creates a 'th' component with css applied */
  th: (...p: TSP) => s('th' as unk as FC<HTP['th']>)(...p),
  /** creates a 'thead' component with css applied */
  thead: (...p: TSP) => s('thead' as unk as FC<HTP['thead']>)(...p),
  /** creates a 'time' component with css applied */
  time: (...p: TSP) => s('time' as unk as FC<HTP['time']>)(...p),
  /** creates a 'tr' component with css applied */
  tr: (...p: TSP) => s('tr' as unk as FC<HTP['tr']>)(...p),
  /** creates a 'u' component with css applied */
  u: (...p: TSP) => s('u' as unk as FC<HTP['u']>)(...p),
  /** creates a 'ul' component with css applied */
  ul: (...p: TSP) => s('ul' as unk as FC<HTP['ul']>)(...p),
  /** creates a 'video' component with css applied */
  video: (...p: TSP) => s('video' as unk as FC<HTP['video']>)(...p),
})
