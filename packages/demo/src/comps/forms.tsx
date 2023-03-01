import './forms.pcss'

import {classJoin} from '@slimr/styled'

type CheckboxProps = Omit<JSX.IntrinsicElements['input'], 'name'> & {
  divProps?: JSX.IntrinsicElements['div']
  error?: string
  label: string
  name: string
}
/**
 * Checkbox: A fancy wrapper for HTML Checkboxes, bc they are not style-able :-(
 */
export function CheckboxInput({divProps = {}, error, label, ...inputProps}: CheckboxProps) {
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
export function GenericError({
  error,
  ...divProps
}: JSX.IntrinsicElements['div'] & {error?: string}) {
  return error ? (
    <div {...divProps} className="small generic-error">
      {error}
    </div>
  ) : null
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
export function TextInput({label, error, divProps, ...inputProps}: TextInputProps) {
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
