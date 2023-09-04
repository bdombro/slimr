import {setPageMeta} from '@slimr/util'

import {Filler} from '~/comps/filler'
import {Layout} from '~/comps/layout-default'

/**
 * A demo of route in a route stack. Click "Inner Page" to go deeper down
 */
export default function StackTest({url}: {url: URL}) {
  const {title, description} = setPageMeta({
    title: 'Stack Test',
    description:
      'A demo of route in a route stack. Click "Inner Page" to go deeper down the rabbit hole. And then notice when clicking the nav to another page and returning that the inner page and scroll position are restored.',
  })
  return (
    <Layout>
      <Layout.Section>
        <h1>{title}</h1>
        <p>
          <b>Current URL: {url.pathname}</b>
        </p>
        <p>{description}</p>
        <p>
          <a href={`${url.pathname}/inners`}>Goto inner page</a>
          <br />
          <a href="#back">Go back in stack</a>
        </p>
        <Filler />
      </Layout.Section>
    </Layout>
  )
}
