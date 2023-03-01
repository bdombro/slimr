import {useEffect} from 'react'

import {Layout} from '~/comps/layout-default'
import {router as r} from '~/router'

/**
 * A demo of route in a stack index route that redirects to the first page
 */
export default function Planets() {
  useEffect(() => r.replace(r.routes.planetsByPage, {page: '1'}), [])
  return (
    <Layout>
      <></>
    </Layout>
  )
}
