interface SetPageMetaProps {
  /** Sets title, meta:og:title. Is postfixed by ` - {siteName}` **/
  title: string
  /** Sets meta:og:site_name **/
  siteName?: string
  /** Sets meta:description **/
  description?: string
  /** Sets meta:og:image **/
  image?: string
  /** Sets meta:og:locale **/
  locale?: string
}
interface SetPageMetaReturn {
  /** The current page title, meta:og:title. Is postfixed by ` - {siteName}` **/
  title: string
  /** The current meta:og:site_name **/
  siteName: string
  /** The current meta:description **/
  description: string
  /** The current meta:og:image **/
  image: string
  /** The current meta:og:locale **/
  locale: string
}

/**
 * Allows setting common page attrs.
 *
 * - Intelligently use the attrs, only setting if changed
 * - Resets back to initial if omitted, based on initial introspection
 * - Stores element handles in memory to remove need to query the dom
 *   on every update
 *
 * > Note: Set `setPageMeta.testMode=true` to disable setPageMeta for testing
 *
 * @param
 * object: an object of key/val pairs of meta attrs to set
 *
 * @returns
 * object: an object of key/val pairs of meta attrs that are currently set
 *
 * @dependency
 *
 * The page should already have default meta tags. Example:
 *
 * ```html
 * <title>React Template</title>
 * <meta property="og:title" content="React template" />
 * <meta property="og:site_name" content="React Template" />
 * <meta property="og:locale" content="en_US" />
 * <link rel="canonical" href="https://react-template.com" />
 * <meta
 *   name="description"
 *   content="A template to build tiny Preact applications"
 * />
 * <meta
 *   property="og:description"
 *   content="A template to build tiny React applications"
 * />
 * <meta
 *   property="og:url"
 *   content="https://github.com/bdombro/react-template"
 * />
 * <meta
 *   property="og:image"
 *   content="https://preact-template.com/apple-touch-icon.png"
 * />
 * ```
 *
 * @example
 *
 * ```typescript
 * const {description} = setPageMeta({
 *   title: `Hello World`,
 *   description: 'This page is awesome',
 * })
 * ```
 */
export function setPageMeta(p: SetPageMetaProps): SetPageMetaReturn {
  const {
    getLink,
    siteNameE,
    ogTitleMc,
    localeMc,
    descriptionMc,
    ogDescriptionMc,
    ogUrlMc,
    ogSiteNameMc,
    ogImageMc,
  } = getHeadHandles()
  const title = p.title ? `${p.title} - ${siteNameE}` : siteNameE
  if (title !== document.title) document.title = title

  const link = getLink()
  if (link.href !== location.href) link.href = location.href

  const locale = localeMc.upsert(p.locale)
  const description = descriptionMc.upsert(p.description)
  const siteName = ogSiteNameMc.upsert(p.siteName)
  const image = ogImageMc.upsert(p.image)

  ogTitleMc.upsert(p.title)
  ogDescriptionMc.upsert(p.description)
  ogUrlMc.upsert(location.href)

  return {
    description,
    image,
    locale,
    siteName,
    title: p.title || title,
  }
}
setPageMeta.testMode = !('document' in globalThis)

/** Wrapper class on meta elements to simplify usage and make more DRY **/
class MetaClass {
  get: () => string
  orig: string
  last?: string
  set: (val: string) => string
  constructor(getter: () => Element) {
    this.get = () =>
      setPageMeta.testMode
        ? ''
        : this.last || getter().getAttribute('content') || throwError(`No content for ${getter}`)
    this.set = (v: string) => {
      if (setPageMeta.testMode) return v
      getter().setAttribute('content', v)
      return (this.last = v)
    }
    this.orig = this.last = this.get()
  }
  upsert(val?: string): string {
    if (setPageMeta.testMode) return val || ''
    if (!val) return (val = this.orig)
    if (this.last !== val) return this.set(val)
    return this.last
  }
}

const byName = (name: string) => {
  return find(`meta[name="${name}"]`)
}
const byProp = (prop: string) => {
  return find(`meta[property="${prop}"]`)
}
const find = (selector: string): HTMLMetaElement => {
  if (setPageMeta.testMode) {
    return {
      getAttribute: () => '',
      setAttribute: (v: any) => v,
    } as unknown as HTMLMetaElement
  }
  return document.head.querySelector(selector) || throwError(`Missing: ${selector}`)
}

interface HeadHandles {
  getLink: () => HTMLLinkElement
  siteNameE: string
  ogTitleMc: InstanceType<typeof MetaClass>
  localeMc: InstanceType<typeof MetaClass>
  descriptionMc: InstanceType<typeof MetaClass>
  ogDescriptionMc: InstanceType<typeof MetaClass>
  ogUrlMc: InstanceType<typeof MetaClass>
  ogSiteNameMc: InstanceType<typeof MetaClass>
  ogImageMc: InstanceType<typeof MetaClass>
}

/** Helper handles with cache  */
function getHeadHandles(): HeadHandles {
  if (getHeadHandles.last) return getHeadHandles.last
  return (getHeadHandles.last = {
    getLink: () => find('link[rel="canonical"]') as unknown as HTMLLinkElement,
    siteNameE: byProp('og:site_name').getAttribute('content') || '',
    ogTitleMc: new MetaClass(() => byProp('og:title')),
    localeMc: new MetaClass(() => byProp('og:locale')),
    descriptionMc: new MetaClass(() => byName('description')),
    ogDescriptionMc: new MetaClass(() => byProp('og:description')),
    ogUrlMc: new MetaClass(() => byProp('og:url')),
    ogSiteNameMc: new MetaClass(() => byProp('og:site_name')),
    ogImageMc: new MetaClass(() => byProp('og:image')),
  })
}
getHeadHandles.last = null as unknown as HeadHandles

/** Convenience function to throw an error */
function throwError(msg: string): never {
  throw new Error(msg)
}
