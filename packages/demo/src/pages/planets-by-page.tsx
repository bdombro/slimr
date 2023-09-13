import type {RouteMatch} from '@slimr/router'
import {setPageMeta} from '@slimr/util'

import {Layout} from '~/comps/layout-default'
import {router} from '~/router'
import * as sw from '~/util/swapi'

import {useSWR} from '../../../react/esm'

/**
 * A demo of a route stack and data fetching with swr
 */
export default function PlanetsByPage({route}: {route: RouteMatch}) {
  const page = route.urlParams!.page

  const {title, description} = setPageMeta({
    title: `Planets Page ${page}`,
    description: `A demo of a route stack and data fetching. Notice that it takes a moment to load the data at first, but then you never wait for the same data to load twice. Also notice that the page state is restored when you navigate to another page in the nav menu and return.`,
  })

  const data = useSWR(() => sw.Planets.getPage(Number(page)), [page], {throttle: Infinity})

  return (
    <Layout>
      <Layout.Section>
        <h1>{title}</h1>
        <p>{description}</p>
        <button
          className="tertiary left"
          id="refetch-page"
          onClick={() => data.refresh()}
          disabled={data.loading}
          type="button"
        >
          Refetch
        </button>
        <button
          className="middle"
          id="goto-prior-page"
          disabled={page === '1'}
          onClick={() => {
            router.goto(route, {page: `${Number(page) - 1}`})
          }}
          type="button"
        >
          Prior Page
        </button>
        <button
          className="right"
          id="goto-next-page"
          onClick={() => {
            router.goto(route, {page: `${Number(page) + 1}`})
          }}
          type="button"
        >
          Next Page
        </button>
        {data.loading && <p>Loading...</p>}
        {data.result?.map(planet => (
          <F key={planet.name}>
            <h3>{planet.name}</h3>
            <ul style={{wordBreak: 'break-word'}}>
              {Object.entries(planet)
                .slice(1)
                .map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
            </ul>
          </F>
        ))}
      </Layout.Section>
    </Layout>
  )
}
