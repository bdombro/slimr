import {FormError, useForm} from '@slimr/forms'
import {mergeRefs, numericStringMask} from '@slimr/util'
import {forwardRef, useEffect, useRef, useState} from 'react'

const phoneNumberRegex = /^\(\d{3}\)\s\d{3}-\d{4}$/

export default function Form() {
  const {Form, accepted, errors, submitted, submitting} = useForm()
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.currentTarget.value = numericStringMask(e.target.value, '(###) ###-####')
      // Replaces so we don't add characters past the end of the string,
      // and so the user can delete characters
      .replace(/-$/, '') // changes '(123) 456-' to '(123) 456'
      .replace(/\) $/, '') // changes '(11)' to '(11'
      .replace(/\($/, '') // changes '(' to ''
  }

  return (
    <Form
      onSubmit={async (e, vals) => {
        assertFormValid(e.currentTarget)
        console.log('vals', vals)
      }}
    >
      <Input
        eagerValidate={submitted}
        name="phone"
        onChange={onChange}
        placeholder="(xxx)xxx-xxxx"
        type="tel"
        validator={str =>
          phoneNumberRegex.test(str) ? null : 'Please enter a valid USA phone number'
        }
      />
      <div>
        <button type="submit">
          {accepted ? 'Success!' : submitting ? 'Submitting...' : 'Submit'}
        </button>
        <button type="reset">Reset</button>
      </div>
      {errors.form && (
        <div
          style={{
            color: 'red',
          }}
        >
          Please correct errors in form and re-submit
        </div>
      )}
    </Form>
  )
}

type HtmlInputProps = JSX.IntrinsicElements['input']
interface InputProps extends HtmlInputProps {
  validator?: (val: string) => string | null
  eagerValidate?: boolean
}

declare global {
  interface EventTarget {
    error?: string | null
  }
}

function assertFormValid(form: HTMLFormElement) {
  const formElements = [...(form.elements as unknown as HTMLInputElement[])]

  const errors: Record<string, string> = {}
  for (const el of formElements) {
    if (el.error) {
      errors[el.name] = el.error
    }
  }

  if (Object.keys(errors).length) {
    throw new FormError(errors)
  }
}

const Input = forwardRef(function Input(
  {eagerValidate, onBlur, onChange, validator, ...props}: InputProps,
  forwardedRef
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasBlurred, setHasBlurred] = useState(false)
  const onValidate = () => {
    const input = inputRef.current
    if (input && validator) {
      input.error = validator(input.value)
      setError(input.error)
    }
  }

  useEffect(() => {
    onValidate()
  }, [])

  return (
    <div>
      <input
        onChange={e => {
          onValidate()
          onChange?.(e)
        }}
        onBlur={e => {
          onValidate()
          setHasBlurred(true)
          onBlur?.(e)
        }}
        ref={mergeRefs([inputRef, forwardedRef])}
        {...props}
      />
      {(eagerValidate || hasBlurred) && error && <div style={{color: 'red'}}>{error}</div>}
    </div>
  )
})
