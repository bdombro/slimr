import {T2SProps} from '@slimr/util'
import {FC} from 'react'

import {styledBase as s} from './core.js'

/** Shorthand type */
type unk = unknown
/** Shorthand type */
type TSP = T2SProps
/** Shorthand type */
type HTP = JSX.IntrinsicElements

/**
 * Create React components with styles using familiar syntax. See
 * [npm](https://www.npmjs.com/package/@slimr/styled) for more info.
 *
 * @param component
 * a functional component to be styled; must accept a className prop
 *
 * @returns
 * a function that accepts a template string of css returns a decorated React component
 *
 * @example
 * const Button = styled('button')`
 *  c: red; // color shorthand
 *  w: [100%, null, 300px]; // responsive width = 100% on mobile, 300px on desktop
 * `
 * const Button2 = styled.button`
 *   c: blue;
 * `
 * const Button3 = styled(Button)`
 *   bg: red;
 * `
 */
export const styled = Object.assign(s, {
  /** creates a 'a' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  a: (...p: TSP) => s('a' as unk as FC<HTP['a']>)(...p),
  /** creates a 'abbr' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  abbr: (...p: TSP) => s('abbr' as unk as FC<HTP['abbr']>)(...p),
  /** creates a 'address' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  address: (...p: TSP) => s('address' as unk as FC<HTP['address']>)(...p),
  /** creates a 'area' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  area: (...p: TSP) => s('area' as unk as FC<HTP['area']>)(...p),
  /** creates a 'article' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  article: (...p: TSP) => s('article' as unk as FC<HTP['article']>)(...p),
  /** creates a 'aside' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  aside: (...p: TSP) => s('aside' as unk as FC<HTP['aside']>)(...p),
  /** creates a 'audio' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  audio: (...p: TSP) => s('audio' as unk as FC<HTP['audio']>)(...p),
  /** creates a 'b' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  b: (...p: TSP) => s('b' as unk as FC<HTP['b']>)(...p),
  /** creates a 'big' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info.; Deprecated so left out */
  // big: (...p: TSP) => styled('big' as unk as FC<HTP['big']>)(...p),
  /** creates a 'blockquote' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  blockquote: (...p: TSP) => s('blockquote' as unk as FC<HTP['blockquote']>)(...p),
  /** creates a 'body' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info.; omitted bc doesnt seem useful */
  // body: (...p: TSP) => styled('body' as unk as FC<HTP['body']>)(...p),
  /** creates a 'br' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info.; omitted bc doesnt seem useful */
  br: (...p: TSP) => s('br' as unk as FC<HTP['br']>)(...p),
  /** creates a 'button' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  button: (...p: TSP) => s('button' as unk as FC<HTP['button']>)(...p),
  /** creates a 'caption' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  caption: (...p: TSP) => s('caption' as unk as FC<HTP['caption']>)(...p),
  /** creates a 'cite' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  cite: (...p: TSP) => s('cite' as unk as FC<HTP['cite']>)(...p),
  /** creates a 'code' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  code: (...p: TSP) => s('code' as unk as FC<HTP['code']>)(...p),
  /** creates a 'col' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  col: (...p: TSP) => s('col' as unk as FC<HTP['col']>)(...p),
  /** creates a 'colgroup' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  colgroup: (...p: TSP) => s('colgroup' as unk as FC<HTP['colgroup']>)(...p),
  /** creates a 'dd' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  dd: (...p: TSP) => s('dd' as unk as FC<HTP['dd']>)(...p),
  /** creates a 'del' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  del: (...p: TSP) => s('del' as unk as FC<HTP['del']>)(...p),
  /** creates a 'details' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  details: (...p: TSP) => s('details' as unk as FC<HTP['details']>)(...p),
  /** creates a 'dfn' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  dfn: (...p: TSP) => s('dfn' as unk as FC<HTP['dfn']>)(...p),
  /** creates a 'dialog' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  dialog: (...p: TSP) => s('dialog' as unk as FC<HTP['dialog']>)(...p),
  /** creates a 'div' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  div: (...p: TSP) => s('div' as unk as FC<HTP['div']>)(...p),
  /** creates a 'dl' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  dl: (...p: TSP) => s('dl' as unk as FC<HTP['dl']>)(...p),
  /** creates a 'dt' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  dt: (...p: TSP) => s('dt' as unk as FC<HTP['dt']>)(...p),
  /** creates a 'em' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  em: (...p: TSP) => s('em' as unk as FC<HTP['em']>)(...p),
  /** creates a 'embed' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  embed: (...p: TSP) => s('embed' as unk as FC<HTP['embed']>)(...p),
  /** creates a 'fieldset' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  fieldset: (...p: TSP) => s('fieldset' as unk as FC<HTP['fieldset']>)(...p),
  /** creates a 'figcaption' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  figcaption: (...p: TSP) => s('figcaption' as unk as FC<HTP['figcaption']>)(...p),
  /** creates a 'figure' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  figure: (...p: TSP) => s('figure' as unk as FC<HTP['figure']>)(...p),
  /** creates a 'footer' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  footer: (...p: TSP) => s('footer' as unk as FC<HTP['footer']>)(...p),
  /** creates a 'form' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  form: (...p: TSP) => s('form' as unk as FC<HTP['form']>)(...p),
  /** creates a 'h1' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  h1: (...p: TSP) => s('h1' as unk as FC<HTP['h1']>)(...p),
  /** creates a 'h2' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  h2: (...p: TSP) => s('h2' as unk as FC<HTP['h2']>)(...p),
  /** creates a 'h3' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  h3: (...p: TSP) => s('h3' as unk as FC<HTP['h3']>)(...p),
  /** creates a 'h4' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  h4: (...p: TSP) => s('h4' as unk as FC<HTP['h4']>)(...p),
  /** creates a 'h5' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  h5: (...p: TSP) => s('h5' as unk as FC<HTP['h5']>)(...p),
  /** creates a 'h6' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  h6: (...p: TSP) => s('h6' as unk as FC<HTP['h6']>)(...p),
  /** creates a 'header' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  header: (...p: TSP) => s('header' as unk as FC<HTP['header']>)(...p),
  /** creates a 'hgroup' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  hgroup: (...p: TSP) => s('hgroup' as unk as FC<HTP['hgroup']>)(...p),
  /** creates a 'hr' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  hr: (...p: TSP) => s('hr' as unk as FC<HTP['hr']>)(...p),
  /** creates a 'i' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  i: (...p: TSP) => s('i' as unk as FC<HTP['i']>)(...p),
  /** creates a 'iframe' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  iframe: (...p: TSP) => s('iframe' as unk as FC<HTP['iframe']>)(...p),
  /** creates a 'img' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  img: (...p: TSP) => s('img' as unk as FC<HTP['img']>)(...p),
  /** creates a 'input' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  input: (...p: TSP) => s('input' as unk as FC<HTP['input']>)(...p),
  /** creates a 'ins' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  ins: (...p: TSP) => s('ins' as unk as FC<HTP['ins']>)(...p),
  /** creates a 'kbd' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  kbd: (...p: TSP) => s('kbd' as unk as FC<HTP['kbd']>)(...p),
  /** creates a 'label' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  label: (...p: TSP) => s('label' as unk as FC<HTP['label']>)(...p),
  /** creates a 'legend' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  legend: (...p: TSP) => s('legend' as unk as FC<HTP['legend']>)(...p),
  /** creates a 'li' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  li: (...p: TSP) => s('li' as unk as FC<HTP['li']>)(...p),
  /** creates a 'main' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  main: (...p: TSP) => s('main' as unk as FC<HTP['main']>)(...p),
  /** creates a 'map' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  map: (...p: TSP) => s('map' as unk as FC<HTP['map']>)(...p),
  /** creates a 'mark' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  mark: (...p: TSP) => s('mark' as unk as FC<HTP['mark']>)(...p),
  /** creates a 'meter' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  meter: (...p: TSP) => s('meter' as unk as FC<HTP['meter']>)(...p),
  /** creates a 'nav' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  nav: (...p: TSP) => s('nav' as unk as FC<HTP['nav']>)(...p),
  /** creates a 'object' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  object: (...p: TSP) => s('object' as unk as FC<HTP['object']>)(...p),
  /** creates a 'ol' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  ol: (...p: TSP) => s('ol' as unk as FC<HTP['ol']>)(...p),
  /** creates a 'optgroup' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  optgroup: (...p: TSP) => s('optgroup' as unk as FC<HTP['optgroup']>)(...p),
  /** creates a 'option' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  option: (...p: TSP) => s('option' as unk as FC<HTP['option']>)(...p),
  /** creates a 'output' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  output: (...p: TSP) => s('output' as unk as FC<HTP['output']>)(...p),
  /** creates a 'p' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  p: (...p: TSP) => s('p' as unk as FC<HTP['p']>)(...p),
  /** creates a 'picture' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  picture: (...p: TSP) => s('picture' as unk as FC<HTP['picture']>)(...p),
  /** creates a 'pre' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  pre: (...p: TSP) => s('pre' as unk as FC<HTP['pre']>)(...p),
  /** creates a 'progress' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  progress: (...p: TSP) => s('progress' as unk as FC<HTP['progress']>)(...p),
  /** creates a 'q' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  q: (...p: TSP) => s('q' as unk as FC<HTP['q']>)(...p),
  /** creates a 'rp' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  rp: (...p: TSP) => s('rp' as unk as FC<HTP['rp']>)(...p),
  /** creates a 'rt' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  rt: (...p: TSP) => s('rt' as unk as FC<HTP['rt']>)(...p),
  /** creates a 'ruby' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  ruby: (...p: TSP) => s('ruby' as unk as FC<HTP['ruby']>)(...p),
  /** creates a 's' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  s: (...p: TSP) => s('s' as unk as FC<HTP['s']>)(...p),
  /** creates a 'samp' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  samp: (...p: TSP) => s('samp' as unk as FC<HTP['samp']>)(...p),
  /** creates a 'section' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  section: (...p: TSP) => s('section' as unk as FC<HTP['section']>)(...p),
  /** creates a 'select' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  select: (...p: TSP) => s('select' as unk as FC<HTP['select']>)(...p),
  /** creates a 'small' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  small: (...p: TSP) => s('small' as unk as FC<HTP['small']>)(...p),
  /** creates a 'span' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  span: (...p: TSP) => s('span' as unk as FC<HTP['span']>)(...p),
  /** creates a 'strong' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  strong: (...p: TSP) => s('strong' as unk as FC<HTP['strong']>)(...p),
  /** creates a 'sub' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  sub: (...p: TSP) => s('sub' as unk as FC<HTP['sub']>)(...p),
  /** creates a 'summary' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  summary: (...p: TSP) => s('summary' as unk as FC<HTP['summary']>)(...p),
  /** creates a 'sup' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  sup: (...p: TSP) => s('sup' as unk as FC<HTP['sup']>)(...p),
  /** creates a 'table' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  table: (...p: TSP) => s('table' as unk as FC<HTP['table']>)(...p),
  /** creates a 'tbody' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  tbody: (...p: TSP) => s('tbody' as unk as FC<HTP['tbody']>)(...p),
  /** creates a 'td' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  td: (...p: TSP) => s('td' as unk as FC<HTP['td']>)(...p),
  /** creates a 'textarea' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  textarea: (...p: TSP) => s('textarea' as unk as FC<HTP['textarea']>)(...p),
  /** creates a 'tfoot' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  tfoot: (...p: TSP) => s('tfoot' as unk as FC<HTP['tfoot']>)(...p),
  /** creates a 'th' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  th: (...p: TSP) => s('th' as unk as FC<HTP['th']>)(...p),
  /** creates a 'thead' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  thead: (...p: TSP) => s('thead' as unk as FC<HTP['thead']>)(...p),
  /** creates a 'time' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  time: (...p: TSP) => s('time' as unk as FC<HTP['time']>)(...p),
  /** creates a 'tr' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  tr: (...p: TSP) => s('tr' as unk as FC<HTP['tr']>)(...p),
  /** creates a 'u' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  u: (...p: TSP) => s('u' as unk as FC<HTP['u']>)(...p),
  /** creates a 'ul' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  ul: (...p: TSP) => s('ul' as unk as FC<HTP['ul']>)(...p),
  /** creates a 'video' component with css applied; See [npm](https://www.npmjs.com/package/@slimr/styled) for more info. */
  video: (...p: TSP) => s('video' as unk as FC<HTP['video']>)(...p),
})
