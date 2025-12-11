import { Layout } from "~/comps/layout-default"
import { router } from "~/router"

/**
 * A demo of route in a stack index route that redirects to the first page
 */
export default function Planets() {
	useEffect(() => router.replace(router.routes.planetsByPage, { page: "1" }), [])
	return <Layout></Layout>
}
