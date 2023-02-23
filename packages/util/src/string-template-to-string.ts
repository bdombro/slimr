/**
 * Assemble a string from a string template (aka template string) array and a
 * list of placeholders. Is useful if you want the style of a template string
 * but really just need a string arg. Also has the convenience of accepting
 * either a template string array or a string as the first arg.
 *
 * Uses alias `t2s`, as in template-string-to-string, for brevity.
 *
 * i.e.
 * const myFoo = (...props: T2SProps) => t2s(...props);
 * myFoo`hello ${name}` => 'hello world'
 * myFoo(`hello ${name}`) => 'hello world'
 */
export function t2s(...tsp: T2SProps) {
  const [s, ...p] = tsp
  return typeof s === 'string' ? s : s.map((s, i) => s + (p?.[i] ?? '')).join('')
}
export type T2SProps = [strings: TemplateStringsArray | string, ...placeHolders: string[]]
