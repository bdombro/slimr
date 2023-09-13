import {FormValues, formToValues} from '@slimr/util'
import React, {
  createContext,
  forwardRef,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

/**
 * An enhanced HTML form with auto-disabling, auto-reset, error handling, more JS events, and context to its children.
 *
 * @ref
 * https://www.npmjs.com/package/@slimr/forms
 *
 * @usage [demo app](../packages/demo/src/pages/form.tsx)
 */
export const SForm = memo(
  forwardRef<HTMLFormElement, SFormProps>(function FormComponent(
    {children, disableWhileSubmitting = true, resetOnAccepted, onReset, onSubmit, ...formProps},
    forwardedRef
  ) {
    /** Resets the state onReset */
    function _onReset(e: ReactFormEvent) {
      const formElements = [...(e.currentTarget.elements as unknown as HTMLInputElement[])]
      if (disableWhileSubmitting) {
        formElements.forEach(e => (e.disabled = e.disabledBefore))
      }
      onReset?.(e)
    }

    /** A form wrapper that has useForm magic sprinkled in */
    async function _onSubmit(formEvent: ReactFormEvent) {
      formEvent.preventDefault()
      const form = formEvent.currentTarget

      const formElements = [...(form.elements as unknown as HTMLInputElement[])]

      if (disableWhileSubmitting) {
        formElements.forEach(e => {
          e.disabledBefore = e.disabled
          e.disabled = true
        })
      }

      form.dispatchEvent(new Event('submitting'))

      try {
        if (onSubmit) {
          await promisify(onSubmit)(formEvent, formToValues(formEvent.currentTarget))
        }
        if (resetOnAccepted) {
          form.reset()
        }
        form.dispatchEvent(new Event('accepted'))
      } catch (error: unknown) {
        form.dispatchEvent(new Event('rejected'))
        if (disableWhileSubmitting) {
          formElements.forEach(e => (e.disabled = e.disabledBefore))
        }
        if (error instanceof SFormError) {
          for (const e of formElements) {
            const fieldError = error.errorSet[e.name]
            if (fieldError) {
              e.setCustomValidity(fieldError)
            }
          }
        } else {
          throw error
        }
      }
    }

    return (
      <form onReset={_onReset} onSubmit={_onSubmit} ref={forwardedRef} {...formProps}>
        <FormContextProvider>{children}</FormContextProvider>
      </form>
    )
  })
)

const formDefaultState: FormState = {
  accepted: false,
  rejected: false,
  submitted: false,
  submitting: false,
}
const FormContext = createContext<FormState>(formDefaultState)

/**
 * A hook to get the current state of the form
 */
export const useSFormContext = () => useContext(FormContext)
function FormContextProvider({children}: {children: React.ReactNode}) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FormState>(formDefaultState)

  useEffect(() => {
    const form = ref.current?.closest('form')
    if (!form) return
    const elements = [...(form.elements as unknown as HTMLInputElement[])]

    const unsubscribes: (() => void)[] = []

    const onSubmitting = () => {
      setState(last => ({...last, accepted: false, submitting: true}))
    }
    form.addEventListener('submitting', onSubmitting)
    unsubscribes.push(() => form.removeEventListener('submitting', onSubmitting))

    const onAccepted = () => {
      setState(last => ({...last, accepted: true, rejected: false, submitting: false}))
    }
    form.addEventListener('accepted', onAccepted)
    unsubscribes.push(() => form.removeEventListener('accepted', onAccepted))

    const onRejected = () => {
      setState(last => ({
        ...last,
        accepted: false,
        rejected: true,
        submitting: false,
      }))
    }
    form.addEventListener('rejected', onRejected)
    unsubscribes.push(() => form.removeEventListener('rejected', onRejected))

    const onInvalid = onRejected
    for (const el of elements) {
      el.addEventListener('invalid', onInvalid)
      unsubscribes.push(() => el.removeEventListener('invalid', onInvalid))
    }

    const onReset = () => {
      setState(formDefaultState)
    }
    form.addEventListener('reset', onReset)
    unsubscribes.push(() => form.removeEventListener('reset', onReset))

    return () => unsubscribes.forEach(unsubscribe => unsubscribe())
  }, [])

  return (
    <FormContext.Provider value={state}>
      <div ref={ref}>{children}</div>
    </FormContext.Provider>
  )
}

/**
 * An extension of Error that accepts an `errorSet` as a constructor property. It is used to share errors
 * to form elements
 *
 * ```typescript
 * throw new FormError({ field1: 'This field is invalid' })
 * ```
 */
export class SFormError extends Error {
  type = 'ValidationErrorSet'
  errorSet: Partial<FormErrorFieldError>

  constructor(errorSet: Partial<FormErrorFieldError>) {
    super('FormError')
    this.errorSet = errorSet
  }
}

/** Turn any function into an async function */
const promisify =
  <T extends Fnc>(fn: T) =>
  async (...p: Parameters<T>) =>
    fn(...p)

declare global {
  interface EventTarget {
    disabledBefore: boolean
  }
}

type ReactFormEvent = React.FormEvent<HTMLFormElement>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OkAny = any

type Fnc = (...args: OkAny[]) => OkAny

/** The current state of the form */
interface FormState {
  /** If the form has been submitted and processed by the handler without error */
  accepted: boolean
  /** If the form has been submitted and processed by the handler with error */
  rejected: boolean
  /** True if the onSubmit has started but not yet finished */
  submitting: boolean
  /** True if the onSubmit has been started and finished, regardless of outcome. */
  submitted: boolean
}

/** A dictionary of form input names to error message strings  */
type FormErrorFieldError = Record<string, string>

export interface SFormProps extends Omit<JSX.IntrinsicElements['form'], 'onChange' | 'onSubmit'> {
  /** Whether the form elements will be disabled while submitting. Default = true */
  disableWhileSubmitting?: boolean
  /** Like form.onChange, but also returns the current form values */
  onSubmit?: OnSubmit
  /** Whether the form will be reset when the onSubmit handler completes without error */
  resetOnAccepted?: boolean
}

export interface OnSubmit {
  (event: ReactFormEvent, values: FormValues): OkAny
}
