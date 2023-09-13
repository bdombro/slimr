import {setPageMeta} from '@slimr/util'

import {Layout} from '~/comps/layout-default'

/**
 * A page shown when a route is not found
 */
export default function NotFound() {
  const {title, description} = setPageMeta({
    title: 'Not Found',
    description: "Sorry, we can't find a page with that url",
  })
  return (
    <Layout>
      <Layout.Section _textAlign="center">
        <Icon name="error" size={120} />
        <h1 style={{marginTop: 20}}>{title}</h1>
        <p>{description}</p>
      </Layout.Section>
    </Layout>
  )
}
