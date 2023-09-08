import {FormError, OnSubmit, useForm} from '@slimr/forms'
import {mergeRefs, numericStringMask} from '@slimr/util'
import {forwardRef, useEffect, useRef, useState} from 'react'

import {Layout} from '~/comps/layout-default'

export default function Form() {
  const {Form, submitting, submitted, accepted, errors} = useForm()
  const [values, setValues] = useState({})

  const onSubmit: OnSubmit = async (_, vals) => {
    // Tips:
    // 1. useForm already prevents onSubmit from being called
    //    if any inputs have a truthy 'error' property
    // 2. this validation below normally happens on the backend,
    //    but we're doing it here for demo purposes
    const errors: Record<string, string> = {}

    for (const [key, val] of Object.entries(vals)) {
      console.log(key, val)
      if (Array.isArray(val) ? !val.length : !val) {
        errors[key] = 'This field is required.'
      }
    }

    if (vals.email === 'sue@sue.com') {
      errors.email = 'Email is already registered'
    }

    if (vals.phone === '2022222222') {
      errors.phone = 'Phone is already registered'
    }

    if (Object.keys(errors).length) {
      throw new FormError(errors)
    }

    console.log('vals', vals)
  }

  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.currentTarget.value = numericStringMask(e.target.value, '(###) ###-####')
      // Replaces so we don't add characters past the end of the string,
      // and so the user can delete characters
      .replace(/-$/, '') // changes '(123) 456-' to '(123) 456'
      .replace(/\) $/, '') // changes '(11)' to '(11'
      .replace(/\($/, '') // changes '(' to ''
  }

  return (
    <Layout>
      <Layout.Section>
        <h1>Form</h1>
        <Form
          onChange={async (e, val, vals) => {
            // NOTE: setValues on every change causes re-renders
            setValues(vals)
          }}
          onSubmit={onSubmit}
        >
          <div
            style={{
              display: 'grid',
              maxWidth: 300,
            }}
          >
            <input name="text1" placeholder="text field" type="text" />
            {errors['text1'] && <p style={{color: 'red'}}>{errors['text1']}</p>}
            <input name="number1" placeholder="number field" step="1" type="number" />
            {errors['number1'] && <p style={{color: 'red'}}>{errors['number1']}</p>}
            <fieldset>
              <legend>Validator Inputs</legend>
              <Input
                eagerValidate={submitted}
                error={errors['email']}
                name="email"
                placeholder="sue@sue.com"
                type="email"
                validator={str => (emailRegex.test(str) ? null : 'Invalid email')}
              />
              <Input
                eagerValidate={submitted}
                error={errors['phone']}
                name="phone"
                onChange={onPhoneChange}
                placeholder="(xxx)xxx-xxxx"
                type="tel"
                validator={str =>
                  phoneNumberRegex.test(str) ? null : 'Please enter a valid USA phone number'
                }
              />
            </fieldset>
            <fieldset>
              <legend>Input Group</legend>
              <input name="text-group1" placeholder="text-group field" type="text" />
              <input name="text-group1" placeholder="text-group field" type="text" />
              {errors['text-group1'] && <p style={{color: 'red'}}>{errors['text-group1']}</p>}
            </fieldset>
            <div>
              <input type="checkbox" id="checkbox1" name="checkbox1" />
              <label htmlFor="checkbox1">Single checkbox</label>
              {errors['checkbox'] && <p style={{color: 'red'}}>{errors['checkbox']}</p>}
            </div>
            <fieldset>
              <legend>Checkbox Group</legend>
              <div>
                <input type="checkbox" id="checkbox2" name="checkbox-group" value="coding" />
                <label htmlFor="checkbox2">Coding</label>
              </div>
              <div>
                <input type="checkbox" id="checkbox3" name="checkbox-group" value="music" />
                <label htmlFor="checkbox3">Music</label>
              </div>
              {errors['checkbox-group'] && <p style={{color: 'red'}}>{errors['checkbox-group']}</p>}
            </fieldset>
            <fieldset>
              <legend>Radio</legend>
              <div>
                <input type="radio" id="radio1" name="radio1" value="coding" />
                <label htmlFor="radio1">Coding</label>
              </div>
              <div>
                <input type="radio" id="radio2" name="radio1" value="music" />
                <label htmlFor="radio2">Music</label>
              </div>
              {errors['radio1'] && <p style={{color: 'red'}}>{errors['radio1']}</p>}
            </fieldset>
            <textarea name="textarea1" placeholder="textarea field" />
            {errors['textarea1'] && <p style={{color: 'red'}}>{errors['textarea1']}</p>}
            <select name="select-single1">
              <option value="" label="Select One" />
              <option value="option1" label="option1" />
              <option value="option2" label="option2" />
            </select>
            {errors['select-single1'] && <p style={{color: 'red'}}>{errors['select-single1']}</p>}
            <select multiple name="select-multi1">
              <option value="" label="Select One" />
              <option value="option1" label="option1" />
              <option value="option2" label="option2" />
            </select>
            {errors['select-multi1'] && <p style={{color: 'red'}}>{errors['select-multi1']}</p>}
            {errors.form && <p style={{color: 'red'}}>{errors.form}</p>}
            <input disabled={submitting} type="submit" />
            <pre>
              {JSON.stringify(
                {
                  accepted,
                  errors,
                  submitted,
                  values,
                },
                null,
                2
              )}
            </pre>
          </div>
        </Form>
      </Layout.Section>
    </Layout>
  )
}

type HtmlInputProps = JSX.IntrinsicElements['input']
interface InputProps extends HtmlInputProps {
  eagerValidate?: boolean
  error?: string
  validator?: (val: string) => string | null
}

const Input = forwardRef(function Input(
  {eagerValidate, error: errorForwarded, onBlur, onChange, validator, ...props}: InputProps,
  refForwarded
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [errorLocal, setErrorLocal] = useState<string | null | undefined>(errorForwarded)
  const [hasBlurred, setHasBlurred] = useState(false)

  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.currentTarget.value = numericStringMask(e.target.value, '(###) ###-####')
      // Replaces so we don't add characters past the end of the string,
      // and so the user can delete characters
      .replace(/-$/, '') // changes '(123) 456-' to '(123) 456'
      .replace(/\) $/, '') // changes '(11)' to '(11'
      .replace(/\($/, '') // changes '(' to ''
  }

  const onValidate = () => {
    const input = inputRef.current
    if (input && validator) {
      input.error = validator(input.value)
      setErrorLocal(input.error)
    }
  }

  useEffect(() => {
    onValidate()
  }, [])
  useEffect(() => {
    if (errorForwarded) {
      const input = inputRef.current
      if (input) {
        input.error = errorForwarded
      }
    }
    setErrorLocal(errorForwarded)
  }, [errorForwarded])

  return (
    <div>
      <input
        onChange={e => {
          onValidate()
          if (props.type === 'tel') {
            onPhoneChange(e)
          }
          onChange?.(e)
        }}
        onBlur={e => {
          onValidate()
          setHasBlurred(true)
          onBlur?.(e)
        }}
        ref={mergeRefs([inputRef, refForwarded])}
        {...props}
      />
      {(eagerValidate || hasBlurred) && errorLocal && (
        <div style={{color: 'red'}}>{errorLocal}</div>
      )}
    </div>
  )
})

const emailRegex = /.+@.+\..+/
const phoneNumberRegex = /^\(\d{3}\)\s\d{3}-\d{4}$/
