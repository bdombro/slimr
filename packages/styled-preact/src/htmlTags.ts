/**
 * This file is identical to the preact version (../react/htmlTags.ts)
 * Should be kept 1-to-1 identical, so that it's easier to maintain
 */
import { TemplateStringProps } from '@ustyle/css'
import styled, { FC, HtmlTagProps } from './styled.js'

/** Shorthand type */
type unk = unknown
/** Shorthand type */
type TempSProps = TemplateStringProps

export const //
  /** creates a 'a' component with css applied */
  a = (...p: TempSProps) => styled('a' as unk as FC<HtmlTagProps['a']>)(...p),
  /** creates a 'abbr' component with css applied */
  abbr = (...p: TempSProps) => styled('abbr' as unk as FC<HtmlTagProps['abbr']>)(...p),
  /** creates a 'address' component with css applied */
  address = (...p: TempSProps) => styled('address' as unk as FC<HtmlTagProps['address']>)(...p),
  /** creates a 'area' component with css applied */
  area = (...p: TempSProps) => styled('area' as unk as FC<HtmlTagProps['area']>)(...p),
  /** creates a 'article' component with css applied */
  article = (...p: TempSProps) => styled('article' as unk as FC<HtmlTagProps['article']>)(...p),
  /** creates a 'aside' component with css applied */
  aside = (...p: TempSProps) => styled('aside' as unk as FC<HtmlTagProps['aside']>)(...p),
  /** creates a 'audio' component with css applied */
  audio = (...p: TempSProps) => styled('audio' as unk as FC<HtmlTagProps['audio']>)(...p),
  /** creates a 'b' component with css applied */
  b = (...p: TempSProps) => styled('b' as unk as FC<HtmlTagProps['b']>)(...p),
  /** creates a 'base' component with css applied */
  /** creates a 'big' component with css applied */
  big = (...p: TempSProps) => styled('big' as unk as FC<HtmlTagProps['big']>)(...p),
  /** creates a 'blockquote' component with css applied */
  blockquote = (...p: TempSProps) => styled('blockquote' as unk as FC<HtmlTagProps['blockquote']>)(...p),
  /** creates a 'body' component with css applied */
  body = (...p: TempSProps) => styled('body' as unk as FC<HtmlTagProps['body']>)(...p),
  /** creates a 'br' component with css applied */
  br = (...p: TempSProps) => styled('br' as unk as FC<HtmlTagProps['br']>)(...p),
  /** creates a 'button' component with css applied */
  button = (...p: TempSProps) => styled('button' as unk as FC<HtmlTagProps['button']>)(...p),
  /** creates a 'caption' component with css applied */
  caption = (...p: TempSProps) => styled('caption' as unk as FC<HtmlTagProps['caption']>)(...p),
  /** creates a 'cite' component with css applied */
  cite = (...p: TempSProps) => styled('cite' as unk as FC<HtmlTagProps['cite']>)(...p),
  /** creates a 'code' component with css applied */
  code = (...p: TempSProps) => styled('code' as unk as FC<HtmlTagProps['code']>)(...p),
  /** creates a 'col' component with css applied */
  col = (...p: TempSProps) => styled('col' as unk as FC<HtmlTagProps['col']>)(...p),
  /** creates a 'colgroup' component with css applied */
  colgroup = (...p: TempSProps) => styled('colgroup' as unk as FC<HtmlTagProps['colgroup']>)(...p),
  /** creates a 'dd' component with css applied */
  dd = (...p: TempSProps) => styled('dd' as unk as FC<HtmlTagProps['dd']>)(...p),
  /** creates a 'del' component with css applied */
  del = (...p: TempSProps) => styled('del' as unk as FC<HtmlTagProps['del']>)(...p),
  /** creates a 'details' component with css applied */
  details = (...p: TempSProps) => styled('details' as unk as FC<HtmlTagProps['details']>)(...p),
  /** creates a 'dfn' component with css applied */
  dfn = (...p: TempSProps) => styled('dfn' as unk as FC<HtmlTagProps['dfn']>)(...p),
  /** creates a 'dialog' component with css applied */
  dialog = (...p: TempSProps) => styled('dialog' as unk as FC<HtmlTagProps['dialog']>)(...p),
  /** creates a 'div' component with css applied */
  div = (...p: TempSProps) => styled('div' as unk as FC<HtmlTagProps['div']>)(...p),
  /** creates a 'dl' component with css applied */
  dl = (...p: TempSProps) => styled('dl' as unk as FC<HtmlTagProps['dl']>)(...p),
  /** creates a 'dt' component with css applied */
  dt = (...p: TempSProps) => styled('dt' as unk as FC<HtmlTagProps['dt']>)(...p),
  /** creates a 'em' component with css applied */
  em = (...p: TempSProps) => styled('em' as unk as FC<HtmlTagProps['em']>)(...p),
  /** creates a 'embed' component with css applied */
  embed = (...p: TempSProps) => styled('embed' as unk as FC<HtmlTagProps['embed']>)(...p),
  /** creates a 'fieldset' component with css applied */
  fieldset = (...p: TempSProps) => styled('fieldset' as unk as FC<HtmlTagProps['fieldset']>)(...p),
  /** creates a 'figcaption' component with css applied */
  figcaption = (...p: TempSProps) => styled('figcaption' as unk as FC<HtmlTagProps['figcaption']>)(...p),
  /** creates a 'figure' component with css applied */
  figure = (...p: TempSProps) => styled('figure' as unk as FC<HtmlTagProps['figure']>)(...p),
  /** creates a 'footer' component with css applied */
  footer = (...p: TempSProps) => styled('footer' as unk as FC<HtmlTagProps['footer']>)(...p),
  /** creates a 'form' component with css applied */
  form = (...p: TempSProps) => styled('form' as unk as FC<HtmlTagProps['form']>)(...p),
  /** creates a 'h1' component with css applied */
  h1 = (...p: TempSProps) => styled('h1' as unk as FC<HtmlTagProps['h1']>)(...p),
  /** creates a 'h2' component with css applied */
  h2 = (...p: TempSProps) => styled('h2' as unk as FC<HtmlTagProps['h2']>)(...p),
  /** creates a 'h3' component with css applied */
  h3 = (...p: TempSProps) => styled('h3' as unk as FC<HtmlTagProps['h3']>)(...p),
  /** creates a 'h4' component with css applied */
  h4 = (...p: TempSProps) => styled('h4' as unk as FC<HtmlTagProps['h4']>)(...p),
  /** creates a 'h5' component with css applied */
  h5 = (...p: TempSProps) => styled('h5' as unk as FC<HtmlTagProps['h5']>)(...p),
  /** creates a 'h6' component with css applied */
  h6 = (...p: TempSProps) => styled('h6' as unk as FC<HtmlTagProps['h6']>)(...p),
  /** creates a 'header' component with css applied */
  header = (...p: TempSProps) => styled('header' as unk as FC<HtmlTagProps['header']>)(...p),
  /** creates a 'hgroup' component with css applied */
  hgroup = (...p: TempSProps) => styled('hgroup' as unk as FC<HtmlTagProps['hgroup']>)(...p),
  /** creates a 'hr' component with css applied */
  hr = (...p: TempSProps) => styled('hr' as unk as FC<HtmlTagProps['hr']>)(...p),
  /** creates a 'i' component with css applied */
  i = (...p: TempSProps) => styled('i' as unk as FC<HtmlTagProps['i']>)(...p),
  /** creates a 'iframe' component with css applied */
  iframe = (...p: TempSProps) => styled('iframe' as unk as FC<HtmlTagProps['iframe']>)(...p),
  /** creates a 'img' component with css applied */
  img = (...p: TempSProps) => styled('img' as unk as FC<HtmlTagProps['img']>)(...p),
  /** creates a 'input' component with css applied */
  input = (...p: TempSProps) => styled('input' as unk as FC<HtmlTagProps['input']>)(...p),
  /** creates a 'ins' component with css applied */
  ins = (...p: TempSProps) => styled('ins' as unk as FC<HtmlTagProps['ins']>)(...p),
  /** creates a 'kbd' component with css applied */
  kbd = (...p: TempSProps) => styled('kbd' as unk as FC<HtmlTagProps['kbd']>)(...p),
  /** creates a 'label' component with css applied */
  label = (...p: TempSProps) => styled('label' as unk as FC<HtmlTagProps['label']>)(...p),
  /** creates a 'legend' component with css applied */
  legend = (...p: TempSProps) => styled('legend' as unk as FC<HtmlTagProps['legend']>)(...p),
  /** creates a 'li' component with css applied */
  li = (...p: TempSProps) => styled('li' as unk as FC<HtmlTagProps['li']>)(...p),
  /** creates a 'main' component with css applied */
  main = (...p: TempSProps) => styled('main' as unk as FC<HtmlTagProps['main']>)(...p),
  /** creates a 'map' component with css applied */
  map = (...p: TempSProps) => styled('map' as unk as FC<HtmlTagProps['map']>)(...p),
  /** creates a 'mark' component with css applied */
  mark = (...p: TempSProps) => styled('mark' as unk as FC<HtmlTagProps['mark']>)(...p),
  /** creates a 'meter' component with css applied */
  meter = (...p: TempSProps) => styled('meter' as unk as FC<HtmlTagProps['meter']>)(...p),
  /** creates a 'nav' component with css applied */
  nav = (...p: TempSProps) => styled('nav' as unk as FC<HtmlTagProps['nav']>)(...p),
  /** creates a 'object' component with css applied */
  object = (...p: TempSProps) => styled('object' as unk as FC<HtmlTagProps['object']>)(...p),
  /** creates a 'ol' component with css applied */
  ol = (...p: TempSProps) => styled('ol' as unk as FC<HtmlTagProps['ol']>)(...p),
  /** creates a 'optgroup' component with css applied */
  optgroup = (...p: TempSProps) => styled('optgroup' as unk as FC<HtmlTagProps['optgroup']>)(...p),
  /** creates a 'option' component with css applied */
  option = (...p: TempSProps) => styled('option' as unk as FC<HtmlTagProps['option']>)(...p),
  /** creates a 'output' component with css applied */
  output = (...p: TempSProps) => styled('output' as unk as FC<HtmlTagProps['output']>)(...p),
  /** creates a 'p' component with css applied */
  p = (...p: TempSProps) => styled('p' as unk as FC<HtmlTagProps['p']>)(...p),
  /** creates a 'picture' component with css applied */
  picture = (...p: TempSProps) => styled('picture' as unk as FC<HtmlTagProps['picture']>)(...p),
  /** creates a 'pre' component with css applied */
  pre = (...p: TempSProps) => styled('pre' as unk as FC<HtmlTagProps['pre']>)(...p),
  /** creates a 'progress' component with css applied */
  progress = (...p: TempSProps) => styled('progress' as unk as FC<HtmlTagProps['progress']>)(...p),
  /** creates a 'q' component with css applied */
  q = (...p: TempSProps) => styled('q' as unk as FC<HtmlTagProps['q']>)(...p),
  /** creates a 'rp' component with css applied */
  rp = (...p: TempSProps) => styled('rp' as unk as FC<HtmlTagProps['rp']>)(...p),
  /** creates a 'rt' component with css applied */
  rt = (...p: TempSProps) => styled('rt' as unk as FC<HtmlTagProps['rt']>)(...p),
  /** creates a 'ruby' component with css applied */
  ruby = (...p: TempSProps) => styled('ruby' as unk as FC<HtmlTagProps['ruby']>)(...p),
  /** creates a 's' component with css applied */
  s = (...p: TempSProps) => styled('s' as unk as FC<HtmlTagProps['s']>)(...p),
  /** creates a 'samp' component with css applied */
  samp = (...p: TempSProps) => styled('samp' as unk as FC<HtmlTagProps['samp']>)(...p),
  /** creates a 'section' component with css applied */
  section = (...p: TempSProps) => styled('section' as unk as FC<HtmlTagProps['section']>)(...p),
  /** creates a 'select' component with css applied */
  select = (...p: TempSProps) => styled('select' as unk as FC<HtmlTagProps['select']>)(...p),
  /** creates a 'small' component with css applied */
  small = (...p: TempSProps) => styled('small' as unk as FC<HtmlTagProps['small']>)(...p),
  /** creates a 'span' component with css applied */
  span = (...p: TempSProps) => styled('span' as unk as FC<HtmlTagProps['span']>)(...p),
  /** creates a 'strong' component with css applied */
  strong = (...p: TempSProps) => styled('strong' as unk as FC<HtmlTagProps['strong']>)(...p),
  /** creates a 'sub' component with css applied */
  sub = (...p: TempSProps) => styled('sub' as unk as FC<HtmlTagProps['sub']>)(...p),
  /** creates a 'summary' component with css applied */
  summary = (...p: TempSProps) => styled('summary' as unk as FC<HtmlTagProps['summary']>)(...p),
  /** creates a 'sup' component with css applied */
  sup = (...p: TempSProps) => styled('sup' as unk as FC<HtmlTagProps['sup']>)(...p),
  /** creates a 'table' component with css applied */
  table = (...p: TempSProps) => styled('table' as unk as FC<HtmlTagProps['table']>)(...p),
  /** creates a 'tbody' component with css applied */
  tbody = (...p: TempSProps) => styled('tbody' as unk as FC<HtmlTagProps['tbody']>)(...p),
  /** creates a 'td' component with css applied */
  td = (...p: TempSProps) => styled('td' as unk as FC<HtmlTagProps['td']>)(...p),
  /** creates a 'textarea' component with css applied */
  textarea = (...p: TempSProps) => styled('textarea' as unk as FC<HtmlTagProps['textarea']>)(...p),
  /** creates a 'tfoot' component with css applied */
  tfoot = (...p: TempSProps) => styled('tfoot' as unk as FC<HtmlTagProps['tfoot']>)(...p),
  /** creates a 'th' component with css applied */
  th = (...p: TempSProps) => styled('th' as unk as FC<HtmlTagProps['th']>)(...p),
  /** creates a 'thead' component with css applied */
  thead = (...p: TempSProps) => styled('thead' as unk as FC<HtmlTagProps['thead']>)(...p),
  /** creates a 'time' component with css applied */
  time = (...p: TempSProps) => styled('time' as unk as FC<HtmlTagProps['time']>)(...p),
  /** creates a 'tr' component with css applied */
  tr = (...p: TempSProps) => styled('tr' as unk as FC<HtmlTagProps['tr']>)(...p),
  /** creates a 'u' component with css applied */
  u = (...p: TempSProps) => styled('u' as unk as FC<HtmlTagProps['u']>)(...p),
  /** creates a 'ul' component with css applied */
  ul = (...p: TempSProps) => styled('ul' as unk as FC<HtmlTagProps['ul']>)(...p),
  /** creates a 'video' component with css applied */
  video = (...p: TempSProps) => styled('video' as unk as FC<HtmlTagProps['video']>)(...p)
