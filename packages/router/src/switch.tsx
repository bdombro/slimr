import React, { memo, useEffect } from "react"

import type { RouterInstance } from "./router-class.js"

/**
 * A Switching component, which renders the first matching route
 */
export const Switch = memo(function Switch({ router }: { router: RouterInstance }) {
	const route = router.route$.use()
	useEffect(router.onLoad, [route.key])
	const C = route.component
	return <C key={route.key} />
})
