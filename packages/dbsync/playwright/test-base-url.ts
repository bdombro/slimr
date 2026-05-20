/** Fixture origin set in playwright.config.ts before tests run. */
export function getFixtureBaseUrl() {
	const baseUrl = process.env.PW_FIXTURE_BASE_URL
	if (!baseUrl) {
		throw new Error(
			"PW_FIXTURE_BASE_URL is unset; playwright.config.ts should set it before tests run",
		)
	}
	return baseUrl
}
