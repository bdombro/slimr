import React, {forwardRef, useRef, useState} from 'react'

type ReactFormEvent = Parameters<React.FormEventHandler<HTMLFormElement>>[0]

type Fnc = (...args: any[]) => any

/** The current state of the form */
interface FormState {
  /** True if the onSubmit has started but not yet finished */
  submitting: boolean
  /** True if the onSubmit has been started and finished, regardless of outcome. */
  submitted: boolean
  /** If the form has been submitted and processed by the handler without error */
  accepted: boolean
  /**
   * A dictionary of error keys to messages. Typically the keys are field names
   * so it's easy to show inline error state and messages for fields. Also
   * helpful to set a 'form' key with a message to be displayed at the bottom.
   *
   * These are set by throwing a 'FormError' in onSubmit
   */
  errors: Record<string, any>
}

interface UseFormReturnType extends FormState {
  /** A form wrapper that has useForm magic sprinkled in */
  Form: React.ForwardRefExoticComponent<
    Omit<JSX.IntrinsicElements['form'], 'ref'> & React.RefAttributes<HTMLFormElement>
  >
}

/** A dictionary of form input names to error message strings  */
type FormErrorFieldError = Record<string, string>

/**
 * A hook that returns a Form component and the form state.
 *
 * @ref
 * https://www.npmjs.com/package/@slimr/forms
 *
 * ```tsx
 * import {formError, useForm} from '@slimr/forms'
 * import {formToValues} from '@slimr/util'
 *
 * function MyForm() {
 *   const { Form, submitting, submitted, accepted, errors} = useForm()
 *
 *   const onSubmit = async (e: React.FormEventHandler<HTMLFormElement> => {
 *     const vals = formToJson(e.target as HTMLFormElement)
 *     const errors: Record<string, string> = {}
 *     if (!vals.name) {
 *       errors.name = 'Name is required'
 *     }
 *     if (!vals.terms) {
 *       errors.checkbox = 'You must agree to the terms'
 *     }
 *     if (Object.keys(errors).length) {
 *       throw new FormError(errors)
 *     }
 *   }
 *
 *   return (
 *     <Form onSubmit={onSubmit}>
 *       <input disabled={submitting || accepted} name="name" />
 *       <div>{errors.name}<div>
 *       <input disabled={submitting || accepted} name="terms" type="checkbox" />
 *       <div>{errors.terms}<div>
 *       <button type="submit">Submit</button>
 *       <button type="reset">Reset</button>
 *     </Form>
 *   )
 * }
 * ```
 */
export function useForm(): UseFormReturnType {
  const [state, setState] = useState(formDefaultState)

  /** A form wrapper that has useForm magic sprinkled in */
  const FormComponent = forwardRef(function FormComponent(
    {children, onReset, onSubmit, ...formProps}: JSX.IntrinsicElements['form'],
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

  const context: UseFormReturnType = {
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

/**
 * An extension of Error that accepts an `errorSet` as a constructor property. It is used to share error context with `useForm`. When thrown from within an onSubmit handler, `useForm` will set `errorSet` to the `error` state.
 *
 * ```typescript
 * throw new FormError({ form: 'Please add a value for the name field', name: 'This field is required' })
 * ```
 */
export class FormError extends Error {
  type = 'ValidationErrorSet'
  errorSet: Partial<FormErrorFieldError>

  constructor(errorSet: Partial<FormErrorFieldError>) {
    super('One or more values are invalid')
    this.errorSet = errorSet
  }
}

/** Turn any function into an async function */
const promisify =
  <T extends Fnc>(fn: T) =>
  async (...p: Parameters<T>) =>
    fn(...p)
