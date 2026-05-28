import { Router } from "@slimr/router"

const routes = {
	home: { path: "/", exact: true, component: () => "Home" },
	about: { path: "/about", component: () => "About" },
	photos: { path: "/photos", isStack: true, component: () => "Photos" },
	"photos.detail": { path: "/photos/:id", component: () => "Photo Detail" },
	notFound: { exact: false, path: "/", component: () => "Not Found" },
} as any

const router = new Router(routes)

// Expose for Playwright test access
;(window as any).router = router
;(window as any).routes = routes

const content = document.getElementById("content")!
const routeInfo = document.getElementById("route-info")!

// Use the routeMatch passed by subscribe (not router.current, which
// reads location.href before pushStateRaw commits the new URL).
router.route$.subscribe((match) => {
	content.textContent = `Route: ${match.key}`
	routeInfo.textContent = JSON.stringify({
		key: match.key,
		url: location.href,
		path: match.urlParams,
	})
})

// Show initial route
content.textContent = `Route: ${router.current.route.key}`
