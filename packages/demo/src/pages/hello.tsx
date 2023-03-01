import {FormError, useForm} from '@slimr/hooks'
import type {RouteMatch} from '@slimr/router'
import {formToValues, setPageMeta} from '@slimr/util'
import {useEffect, useRef} from 'react'

import {CheckboxInput, GenericError, TextInput} from '~/comps/forms'
import {Layout} from '~/comps/layout-default'

/**
 * A demo of route with url params
 */
export default function Hello({route}: {route: RouteMatch}) {
  const {title, description} = setPageMeta({
    title: `Hello ${route.urlParams!.name}`,
    description: 'A demo of route with url params.',
  })
  return (
    <Layout>
      <Layout.Section>
        <h1>{title}</h1>
        <p>{description}</p>
        <FormExample />
      </Layout.Section>
    </Layout>
  )
}

/** A form example */
function FormExample() {
  const formRef = useRef<HTMLFormElement>(null)
  const {Form, submitting, accepted, errors} = useForm()

  useEffect(() => {
    if (accepted) {
      setTimeout(() => {
        formRef.current?.reset()
      }, 5000)
    }
  }, [accepted])

  return (
    <Form
      onSubmit={async e => {
        const vals = formToValues(e.target as HTMLFormElement)
        const errors: Record<string, string> = {}
        if (!vals.name) {
          errors.name = 'Name is required'
        }
        if (!vals.terms) {
          errors.checkbox = 'You must agree to the terms'
        }
        if (Object.keys(errors).length) {
          throw new FormError(errors)
        }
      }}
      ref={formRef}
    >
      <fieldset style={{paddingTop: 14}}>
        <legend>Test form</legend>
        <TextInput label="Name" name="name" disabled={accepted} error={errors.name} />
        <CheckboxInput
          label="Do you agree to the terms?"
          name="terms"
          disabled={accepted}
          error={errors.checkbox}
        />
        <GenericError error={errors.form} />
        {accepted && (
          <p style={{color: 'var(--color-success)'}}>Success! Form will reset in 5 seconds...</p>
        )}
        <button disabled={submitting} type="submit">
          Submit
        </button>
        <button disabled={submitting} type="reset">
          Reset
        </button>
      </fieldset>
    </Form>
  )
}
