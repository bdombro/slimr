/**
 * Append an element to the head of the document if not already added
 *
 * @param type - The type of element to append (e.g. 'link', 'script')
 * @param attrs - The attributes to set on the element. Tip: use innerHTML to set content
 */
export function appendElement(type: string, attrs: Record<string, string>) {
  if (!('document' in globalThis)) return
  // check if already added
  const key = JSON.stringify({type, ...attrs})
  if (appendElement.cache.has(key)) return
  appendElement.cache.add(key)
  document.head.appendChild(Object.assign(document.createElement(type), attrs))
}
appendElement.cache = new Set()

/**
 * Append a link element to the head of the document if not already added
 *
 * @param attrs - The attributes, excluding rel, to set on the element
 */
export function appendLink(attrs: Record<string, string>) {
  appendElement('link', {...attrs, rel: 'stylesheet'})
}

/**
 * Append a style element to the head of the document if not already added
 *
 * @param attrs - The attributes, excluding rel, to set on the element. Tip: use innerHTML to set content
 */
export function appendStyle(attrs: Record<string, string>) {
  appendElement('style', attrs)
}

/**
 * Append a script element to the head of the document if not already added
 *
 * @param attrs - The attributes to set on the element. Tip: use innerHTML to set content
 */
export function appendScript(attrs: Record<string, string>) {
  appendElement('script', attrs)
}
