type FormJson = Record<string, string | string[] | number | number[] | boolean | boolean[]>

/**
 * Extracts form values from a `form` element, such as e.target from form.onSubmit
 */
export function formToValues(formElement: HTMLFormElement): FormJson {
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
