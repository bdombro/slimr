type FormJson = Record<string, string | string[] | number | number[] | boolean | boolean[]>

/**
 * Extracts form values from a <form> ref, such as e.target from form.onSubmit
 * Is more friendly than the FormData api, but isn't compatible with
 * multipart/form-data encoding -- which is required if there are file inputs.
 * For example, FormData handles checkboxes weirdly
 */
export function formToJson(formElement: HTMLFormElement): FormJson {
  const reqBody: FormJson = {}
  for (const e of formElement.elements as unknown as HTMLInputElement[]) {
    const isArray = e.getAttribute('isarray')
    switch (e.type) {
      case 'submit':
        break
      case 'checkbox':
        reqBody[e.name] = e.checked
        break
      case 'number':
        reqBody[e.name] = isArray ? e.value.split(',').map(Number) : Number(e.value)
        break
      default:
        reqBody[e.name] = isArray ? e.value.split(',') : e.value
    }
  }
  return reqBody
}
