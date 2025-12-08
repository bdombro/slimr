/** A value for an input-like field */
export type FormValue = string | string[] | number | number[] | boolean | boolean[]
/** An object containing all the FormValues for a form */
export type FormValues = Record<string, FormValue>

/**
 * Extracts form values from a `form` element, such as e.target from form.onSubmit
 *
 * - An alternative to the FormData api, aiming to be more predictable, flexible and less awkward.
 *   - For example, FormData has not great way to enumerate all fields (even ones with undefined
 *     values) or multiple checkboxes or multi selects.
 * - Handles text, number, checkboxes, radio buttons, textarea, select
 * - Converts US phone numbers to international format
 * - Value = array if multiple inputs with same 'name', such as checkboxes
 * - Limitation: Can't handle complex forms (multipart/form-data encoding)
 *
 * @usage [Code Sandbox](https://codesandbox.io/s/form-to-json-y7cs3t?file=/src/App.tsx)
 */
export function formToValues(formElement: HTMLFormElement): FormValues {
	const reqBody: FormValues = {}
	// formElement.elements is an HTMLFormElement special attribute that includes
	// all of the form's inputs and textarea elements
	const formElements = [...(formElement.elements as unknown as HTMLInputElement[])]
	for (const e of formElements) {
		if (!e.name) {
			continue
		}

		const isGroup = formElements.filter((e2) => e2.name === e.name).length > 1
		if (isGroup && e.type !== "radio" && !Array.isArray(reqBody[e.name])) {
			reqBody[e.name] = []
		}

		switch (e.type) {
			case "checkbox":
				if (isGroup) {
					if (e.checked) {
						// @ts-expect-error -- ts gets confused about being an array
						reqBody[e.name].push(e.value)
					}
				} else {
					reqBody[e.name] = e.checked && (e.value || true)
				}
				break
			case "radio":
				reqBody[e.name] = reqBody[e.name] || (e.checked ? e.value : "")
				break
			case "select-multiple":
				reqBody[e.name] = Array.from((e as unknown as HTMLSelectElement).options)
					.filter((o) => o.selected)
					.map((o) => o.value)
				break
			default: {
				let val: FormValue = e.value
				if (e.type === "number") {
					val = Number(e.value)
				}
				/** Normalizes a phone number to intl +XYYYZZZAAAA */
				if (e.type === "tel") {
					val = String(val)
					if (val.startsWith("(")) {
						val = `+1${val.replace(/[^\d]/g, "")}`
					}
				}
				if (isGroup) {
					if (val !== "") {
						// @ts-expect-error -- ts gets confused about being an array
						reqBody[e.name].push(val)
					}
				} else {
					reqBody[e.name] = val
				}
			}
		}
	}
	return reqBody
}
