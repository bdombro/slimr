import {formToJson} from '@slimr/util'
import React, {forwardRef, useRef, useState} from 'react'

type ReactFormEvent = Parameters<React.FormEventHandler<HTMLFormElement>>[0]

type Fnc = (...args: any[]) => any

/** The current state of the form */
interface FormState {
  accepted: boolean
  errors: Record<string, any>
  submitting: boolean
  submitted: boolean
}

export interface FormContext extends FormState {
  /** A form wrapper that has useForm magic sprinkled in */
  Form: React.ForwardRefExoticComponent<
    Omit<FormProps, 'ref'> & React.RefAttributes<HTMLFormElement>
  >
}

/** A dictionary of form input names to error message strings  */
type FormErrorFieldError = Record<string, string>

type FormProps = JSX.IntrinsicElements['form'] & {
  /** Like onSubmit, but props = the json value of the form */
  onSubmitJson?: (formValues: ReturnType<typeof formToJson>) => void
}

/**
 * A tiny (500B), minimalistic form hook that returns a Form component which
 * - optimizes for vanilla, uncontrolled input elements
 * - wraps onSubmit to
 *    - auto call event.preventsDefault()
 *    - track submitting, error, submitted, and accepted state
 * - new prop onSubmitJson: a callback that is called with the json value of the form
 *   for more convenient form handling
 * - ~450B when bundled+gzipped with a broader application
 */
export function useForm(): FormContext {
  const [state, setState] = useState(formDefaultState)

  /** A form wrapper that has useForm magic sprinkled in */
  const FormComponent = forwardRef(function FormComponent(
    {children, onReset, onSubmit, onSubmitJson, ...formProps}: FormProps,
    ref: React.Ref<HTMLFormElement>
  ) {
    /** Resets the state onReset */
    function _onReset(e: any) {
      setState(formDefaultState)
      onReset?.(e)
    }

    /** A form wrapper that has useForm magic sprinkled in */
    async function _onSubmit(formEvent: ReactFormEvent) {
      formEvent.preventDefault()
      setState(last => ({...last, submitting: true}))
      try {
        if (onSubmit) {
          await promisify(onSubmit)(formEvent)
        }
        if (onSubmitJson) {
          await promisify(onSubmitJson)(formToJson(formEvent.target as HTMLFormElement))
        }
        setState({
          accepted: true,
          errors: {},
          submitting: false,
          submitted: true,
        })
      } catch (error: any) {
        setState({
          accepted: false,
          errors: {
            form: error.message,
            ...error?.errorSet,
          },
          submitting: false,
          submitted: true,
        })
        if (!(error instanceof FormError)) {
          throw error
        }
      }
    }

    return (
      <form onReset={_onReset} onSubmit={_onSubmit} ref={ref} {...formProps}>
        {children}
      </form>
    )
  })

  const context: FormContext = {
    Form: useRef(FormComponent).current,
    ...state,
  }

  return context
}

const formDefaultState: FormState = {
  submitting: false,
  submitted: false,
  accepted: false,
  errors: {},
}

/** A special error with errorSet -- a key/val map of field-names to errors */
export class FormError extends Error {
  type = 'ValidationErrorSet'
  errorSet: Partial<FormErrorFieldError>

  constructor(errorSet: Partial<FormErrorFieldError>) {
    super('One or more values are invalid')
    this.errorSet = errorSet
  }
}

/** Convenience wrapper to throw FormError */
export function throwFormError(errorSet: Partial<FormErrorFieldError>): never {
  throw new FormError(errorSet)
}

const promisify =
  <T extends Fnc>(fn: T) =>
  async (...p: Parameters<T>) =>
    fn(...p)
