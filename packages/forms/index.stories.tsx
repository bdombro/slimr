import './index.stories.pcss'

import {classJoin} from '@slimr/css'

import {useEffect, useRef} from 'react'

import {throwFormError, useForm} from './src/index.js'

export default {
  title: '@slimr/forms/useForm',
  component: useForm,
  tags: ['autodocs'],
}

/**
 * Use the onSubmitJson prop to handle form submission
 */
export function SubmitHandling() {
  const formRef = useRef<HTMLFormElement>(null)
  const {accepted, errors, Form, submitting} = useForm()

  const onSubmit = (vals: Record<string, any>) => {
    alert('You submitted ' + JSON.stringify(vals))
  }

  return (
    <Form onSubmitJson={onSubmit} ref={formRef}>
      <TextInput label="Name" name="name" disabled={accepted} error={errors.name} />
      <CheckboxInput
        label="Do you agree to the terms?"
        name="terms"
        disabled={accepted}
        error={errors.checkbox}
      />
      <GenericError error={errors.form} />
      <SuccessMessage msg={accepted && 'Success!'} />
      <button disabled={submitting || accepted} type="submit">
        Submit
      </button>
      <button disabled={submitting} type="reset">
        Reset
      </button>
    </Form>
  )
}

/**
 * Throw a form error to enable per-field error messages
 */
export function Validation() {
  const formRef = useRef<HTMLFormElement>(null)
  const {accepted, errors, Form, submitting} = useForm()

  const onSubmit = (vals: Record<string, any>) => {
    const errors: Record<string, string> = {}
    if (!vals.name) {
      errors.name = 'Name is required'
    }
    if (!vals.terms) {
      errors.checkbox = 'You must agree to the terms'
    }
    if (Object.keys(errors).length) {
      throwFormError(errors)
    }
  }

  return (
    <Form onSubmitJson={onSubmit} ref={formRef}>
      <TextInput label="Name" name="name" disabled={accepted} error={errors.name} />
      <CheckboxInput
        label="Do you agree to the terms?"
        name="terms"
        disabled={accepted}
        error={errors.checkbox}
      />
      <GenericError error={errors.form} />
      <SuccessMessage msg={accepted && 'Success!'} />
      <button disabled={submitting || accepted} type="submit">
        Submit
      </button>
      <button disabled={submitting} type="reset">
        Reset
      </button>
    </Form>
  )
}

/**
 * Leverage html native reset features
 */
export function Resetting() {
  const formRef = useRef<HTMLFormElement>(null)
  const {accepted, errors, Form, submitting} = useForm()

  useEffect(() => {
    if (accepted) {
      setTimeout(() => {
        formRef.current?.reset()
      }, 5000)
    }
  }, [accepted])

  return (
    <Form onSubmitJson={console.log} ref={formRef}>
      <TextInput label="Name" name="name" disabled={accepted} error={errors.name} />
      <CheckboxInput
        label="Do you agree to the terms?"
        name="terms"
        disabled={accepted}
        error={errors.checkbox}
      />
      <GenericError error={errors.form} />
      <SuccessMessage msg={accepted && 'Success! Form will reset in 5 seconds...'} />
      <button disabled={submitting || accepted} type="submit">
        Submit
      </button>
      <button disabled={submitting} type="reset">
        Reset
      </button>
    </Form>
  )
}

/**********
 * Helper components
 **********/

type CheckboxProps = Omit<JSX.IntrinsicElements['input'], 'name'> & {
  divProps?: JSX.IntrinsicElements['div']
  error?: string
  label: string
  name: string
}
/**
 * Checkbox: A fancy wrapper for HTML Checkboxes, bc they are not style-able :-(
 */
function CheckboxInput({divProps = {}, error, label, ...inputProps}: CheckboxProps) {
  return (
    <div
      {...divProps}
      data-error={!!error}
      className={classJoin('checkbox-input', divProps?.className)}
    >
      <input id={inputProps.name} {...inputProps} type="checkbox" />
      <label htmlFor={inputProps.name}>{label}</label>
      <GenericError error={error} style={{marginBottom: 0}} />
    </div>
  )
}

/**
 * A generic error to display at the bottom of a form
 */
function GenericError({error, ...divProps}: JSX.IntrinsicElements['div'] & {error?: string}) {
  return error ? (
    <div {...divProps} className="small generic-error">
      {error}
    </div>
  ) : null
}

/**
 * A generic success message
 */
function SuccessMessage({msg}: {msg?: string | false}) {
  return msg ? <p style={{color: 'green'}}>{msg}</p> : null
}

type TextInputProps = Omit<JSX.IntrinsicElements['input'], 'name'> & {
  divProps?: JSX.IntrinsicElements['div'] & {forwardRef?: React.Ref<HTMLDivElement>}
  error?: string
  label: string
  name: string
}
/**
 * An input with label and error handling
 */
function TextInput({label, error, divProps, ...inputProps}: TextInputProps) {
  return (
    <div
      {...divProps}
      className={classJoin('text-input', divProps?.className)}
      data-error={!!error}
      data-disabled={inputProps.disabled}
    >
      <label htmlFor={inputProps.name}>{label}</label>
      <input type="text" id={inputProps.name} {...inputProps} />
      <GenericError error={error} style={{marginBottom: 0}} />
    </div>
  )
}
