export const queryStrings = {
	/**
	 * parse: convenience wrapper to parse URLSearchParams into an Object
	 * @param qs - search string, like location.search
	 */
	parse<T extends Record<string, any>>(qs = location.search) {
		return Object.fromEntries((new URLSearchParams(qs) as any).entries()) as T
	},
	/**
	 * create: create a URLSearchParam string from Object
	 * @param obj - the object
	 * @param options - upsert: update an existing search string; includeQuestionMark: if truthy prepend with '?'
	 */
	create(obj: any, { upsert = false, upsertFrom = location.search, includeQuestionMark = true }) {
		if (upsert) obj = Object.assign(this.parse(upsertFrom), obj)
		Object.entries(obj).forEach(([k, v]) => {
			if (v === undefined) delete obj[k]
		})
		const sp = new URLSearchParams()
		Object.entries(obj).forEach(function setUrlSearchParams([k, v]) {
			sp.set(k, v as any)
		})
		const qs = sp.toString()
		return (includeQuestionMark && qs ? "?" : "") + qs
	},
}
