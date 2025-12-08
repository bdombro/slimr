import "./forms.pcss"

import { classJoin, Input, mergeRefs, type OptionC, Select, Textarea } from "@slimr/react"
import { numericStringMask } from "@slimr/util"
import { forwardRef } from "react"

/**
 * A generic error to display at the bottom of a form
 */
export function GenericError({
	error,
	...divProps
}: Parameters<typeof Div>[0] & { error: string | false | null | undefined }) {
	return (
		<Div
			aria-live="assertive"
			{...divProps}
			className={classJoin("small generic-error", divProps.className)}
			title="error"
		>
			{error}
		</Div>
	)
}

/**
 * An input with label, error, and validation handling
 */
export const InputBox = memo(
	forwardRef<HTMLInputElement, InputBoxProps>(function InputBox(
		{ divProps, label, labelProps, onBlur, onChange, type, validator, ...inputProps },
		forwardedRef,
	) {
		const divRef = useRef<HTMLDivElement>(null)

		const onValidate = () => {
			const div = divRef.current
			const input = div?.querySelector(type === "textarea" ? "textarea" : "input")
			const error = div?.querySelector(".error")
			if (!(div && input && error)) return
			input.setCustomValidity("")
			let nextError: string | false | null | undefined = input.validationMessage
			if (!nextError && type === "password") {
				nextError = password.validator(input.value)
			}
			if (!nextError && type === "tel") {
				nextError = tel.validator(input.value)
			}
			if (!nextError && validator) {
				nextError = validator(input.value)
			}
			input.setCustomValidity(nextError || "")
			error.innerHTML = nextError || ""
			if (!nextError) {
				div.classList.remove("show-error")
			}
		}

		useEffect(() => {
			const div = divRef.current
			const input = div?.querySelector(type === "textarea" ? "textarea" : "input")
			const error = div?.querySelector(".error")
			const form = input?.closest("form")
			if (!(div && input && error && form)) return

			error.innerHTML = input.validationMessage

			const onSubmit = () => {
				// setTimeout to allow validation to run
				setTimeout(() => {
					error.innerHTML = input.validationMessage
					// if the input is invalid, report validity to show the browser's validation UI
					// but only do it once per second to ensure the first input in the form is focused
					if (input.validationMessage && Date.now() - lastReportValidity > 1000) {
						input.reportValidity()
						lastReportValidity = Date.now()
					}
					if (input.validationMessage) {
						div.classList.add("show-error")
					} else {
						div.classList.remove("show-error")
					}
				})
			}
			form.addEventListener("submit", onSubmit)

			const onInvalid = () => {
				// setTimeout to allow validation to run
				setTimeout(() => {
					error.innerHTML = input.validationMessage
					div.classList.add("show-error")
				})
			}
			input.addEventListener("invalid", onInvalid)

			const onReset = () => {
				div.classList.remove("show-error")
				onValidate()
			}
			form.addEventListener("reset", onReset)

			return () => {
				form.removeEventListener("submit", onSubmit)
				input.removeEventListener("invalid", onSubmit)
				form.removeEventListener("reset", onReset)
			}
		}, [])

		if (type === "checkbox") {
			return (
				<Div {...divProps} className={classJoin("checkbox-div", divProps?.className)} ref={divRef}>
					<Input
						id={inputProps.name}
						onChange={(e) => {
							onChange?.(e)
							setTimeout(onValidate)
						}}
						onBlur={(e) => {
							onBlur?.(e as TSFIXME)
							if (e.currentTarget.validationMessage) {
								divRef.current?.classList.add("show-error")
							}
						}}
						ref={forwardedRef}
						type="checkbox"
						{...inputProps}
					/>
					<Label {...labelProps} htmlFor={inputProps.name}>
						{label}
						<RequiredAsterisk show={inputProps.required} />
					</Label>
					<div aria-live="assertive" className="small error" title="error" />
				</Div>
			)
		}

		let InputOrTextarea = Input
		if (type === "textarea") {
			InputOrTextarea = Textarea as unknown as typeof Input
		}

		return (
			<Div {...divProps} className={classJoin("input-div", divProps?.className)} ref={divRef}>
				<Label {...labelProps} htmlFor={inputProps.name}>
					{label}
					<RequiredAsterisk show={inputProps.required} />
				</Label>
				<InputOrTextarea
					onChange={(e) => {
						if (type === "tel") {
							tel.onChange(e)
						}
						onChange?.(e)
						onValidate()
					}}
					onBlur={(e) => {
						onBlur?.(e)
						if (e.currentTarget.validationMessage) {
							divRef.current?.classList.add("show-error")
						}
					}}
					ref={forwardedRef}
					type={type === "textarea" ? undefined : type}
					{...inputProps}
				/>
				<div aria-live="assertive" className="small error" title="error" />
			</Div>
		)
	}),
)
export type InputBoxProps = Omit<Parameters<typeof Input>[0], "id" | "name" | "value"> &
	BaseProps & {
		validator?: (val: string) => string | null | false | undefined
	}

/**
 * A set of radio inputs with label and error handling
 */
export const RadioBox = forwardRef<HTMLDivElement, RadioBoxProps>(function RadioBox(
	{
		defaultValue,
		divProps,
		innerDivProps,
		inputLabelProps,
		label,
		labelProps,
		onChange,
		optionDivProps,
		options,
		...inputProps
	},
	forwardedRef,
) {
	const divRef = useRef<HTMLDivElement>(null)

	const getInputs = () => {
		const div = divRef.current
		if (!div) return []
		return Array.from(div.querySelectorAll("input"))
	}

	useEffect(() => {
		const div = divRef.current
		const inputs = getInputs()
		const input = inputs?.[0]
		const error = div?.querySelector(".error")
		const form = input?.closest("form")
		if (!(div && input && error && form)) return

		error.innerHTML = input.validationMessage

		const onSubmit = () => {
			// setTimeout to allow validation to run
			setTimeout(() => {
				error.innerHTML = input.validationMessage
				// if the input is invalid, report validity to show the browser's validation UI
				// but only do it once per second to ensure the first input in the form is focused
				if (input.validationMessage && Date.now() - lastReportValidity > 1000) {
					input.reportValidity()
					lastReportValidity = Date.now()
				}
				if (input.validationMessage) {
					div.classList.add("show-error")
				} else {
					div.classList.remove("show-error")
				}
			})
		}
		form.addEventListener("submit", onSubmit)

		const onInvalid = () => {
			// setTimeout to allow validation to run
			setTimeout(() => {
				error.innerHTML = input.validationMessage
				div.classList.add("show-error")
			})
		}
		input.addEventListener("invalid", onInvalid)

		const onReset = () => {
			inputs.forEach((i) => i.setCustomValidity(""))
			div.classList.remove("show-error")
		}
		form.addEventListener("reset", onReset)

		return () => {
			form.removeEventListener("submit", onSubmit)
			input.removeEventListener("invalid", onSubmit)
			form.removeEventListener("reset", onReset)
		}
	}, [])

	return (
		<Div
			{...divProps}
			className={classJoin("radio-div", divProps?.className)}
			ref={mergeRefs([forwardedRef, divRef])}
		>
			<Label {...labelProps}>
				{label}
				<RequiredAsterisk show={inputProps.required} />
			</Label>
			<Div {...innerDivProps}>
				{options.map(({ label: oLabel, value: oValue }, i) => (
					<Div key={`radiobox-${oLabel + oValue + i}`} {...optionDivProps}>
						<Input
							id={oValue}
							defaultChecked={oValue === defaultValue}
							onChange={(e) => {
								onChange?.(e)
								getInputs().forEach((i) => i.setCustomValidity(""))
								divRef.current?.classList.remove("show-error")
							}}
							// Also reval onClick bc onChange is unreliable after a form reset
							onClick={() => {
								getInputs().forEach((i) => i.setCustomValidity(""))
								divRef.current?.classList.remove("show-error")
							}}
							type="radio"
							value={oValue}
							{...inputProps}
						/>
						<Label {...inputLabelProps} htmlFor={oValue}>
							{oLabel}
						</Label>
					</Div>
				))}
			</Div>
			<div aria-live="assertive" className="small error" title="error" />
		</Div>
	)
})
export type RadioBoxProps = InputBoxProps & {
	innerDivProps?: Parameters<typeof Div>[0]
	inputLabelProps?: Parameters<typeof Label>[0]
	optionDivProps?: Parameters<typeof Div>[0]
	options: { label: string; value: string }[]
}

/**
 * A select wrapper with label and error handling
 */
export const SelectBox = forwardRef<HTMLSelectElement, SelectBoxProps>(function SelectBox(
	{
		defaultValue,
		divProps,
		label,
		labelProps,
		onBlur,
		onChange,
		options,
		optionProps,
		...selectProps
	},
	forwardedRef,
) {
	const divRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const div = divRef.current
		const select = divRef.current?.querySelector("select")
		const error = div?.querySelector(".error")
		const form = select?.closest("form")
		if (!(div && select && error && form)) return

		error.innerHTML = select.validationMessage

		const onSubmit = () => {
			// setTimeout to allow validation to run
			setTimeout(() => {
				error.innerHTML = select.validationMessage
				// if the input is invalid, report validity to show the browser's validation UI
				// but only do it once per second to ensure the first input in the form is focused
				if (select.validationMessage && Date.now() - lastReportValidity > 1000) {
					select.reportValidity()
					lastReportValidity = Date.now()
				}
				if (select.validationMessage) {
					div.classList.add("show-error")
				} else {
					div.classList.remove("show-error")
				}
			})
		}
		form.addEventListener("submit", onSubmit)

		const onInvalid = () => {
			// setTimeout to allow validation to run
			setTimeout(() => {
				error.innerHTML = select.validationMessage
				div.classList.add("show-error")
			})
		}
		select.addEventListener("invalid", onInvalid)

		const onReset = () => {
			select.setCustomValidity("")
			div.classList.remove("show-error")
		}
		form.addEventListener("reset", onReset)

		return () => {
			form.removeEventListener("submit", onSubmit)
			select.removeEventListener("invalid", onSubmit)
			form.removeEventListener("reset", onReset)
		}
	}, [])

	return (
		<Div {...divProps} className={classJoin("select-div", divProps?.className)} ref={divRef}>
			<Label {...labelProps}>
				{label}
				<RequiredAsterisk show={selectProps.required} />
			</Label>
			<Select
				{...selectProps}
				onChange={(e) => {
					onChange?.(e)
					const select = e.currentTarget.closest("select")
					select?.setCustomValidity("")
					setTimeout(() => {
						if (!select?.validationMessage) {
							divRef.current?.classList.remove("show-error")
						}
					})
				}}
				onBlur={(e) => {
					onBlur?.(e as TSFIXME)
					if (e.currentTarget.validationMessage) {
						divRef.current?.classList.add("show-error")
					}
				}}
				ref={forwardedRef}
			>
				{options.map(({ label, value }, i) => (
					<option
						{...optionProps}
						defaultChecked={value === defaultValue}
						key={`select-options-${label + value + i}`}
						id={value}
						value={value}
					>
						{label}
					</option>
				))}
			</Select>
			<div className="tip only-mac">Tip: Hold ⌘ while clicking to select multiple.</div>
			<div className="tip not-mac not-ios">Tip: Hold 'ctrl' while clicking to select multiple.</div>
			<div aria-live="assertive" className="small error" title="error" />
		</Div>
	)
})
export type SelectBoxProps = Omit<Parameters<typeof Select>[0], "id" | "name" | "value"> &
	BaseProps & {
		options: { label: string; value: string }[]
		optionProps?: Parameters<typeof OptionC>[0]
	}

/**
 * An textarea with label, error, and validation handling
 */
export const TextareaBox = forwardRef<HTMLTextAreaElement, InputBoxProps>(
	function TextArea(inputProps, ref) {
		return <InputBox type="textarea" {...inputProps} ref={ref as TSFIXME} />
	},
)

type BaseProps = {
	divProps?: Parameters<typeof Div>[0]
	label: string
	labelProps?: Omit<Parameters<typeof Label>[0], "htmlFor">
	name: string
}

/**
 * used to track how recently we called input.reportValidity(). tracked so that
 * we don't call it too often and steal focus from the first input in the form
 */
let lastReportValidity = 0

/** Shows a red asterisk to indicate required */
function RequiredAsterisk({ show = false }) {
	return show ? <span style={{ color: "var(--color-danger)" }}>*</span> : null
}

/**
 * A regex for a password with at least 8 digits, 1 number, 1 lowercase letter, 1 uppercase letter
 */
const password = {
	validator: (str: string) =>
		!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(String(str)) &&
		"Password must be at least 8 characters with 1 number, 1 lowercase letter, and 1 uppercase letter",
}

const tel = {
	/** Formats a phone number for input.type = tel */
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
		// If international format
		if (e.currentTarget.value.startsWith("+")) {
			// limit to only + and digits and 16 characters
			e.currentTarget.value = e.currentTarget.value.replace(/[^\d+]/g, "").slice(0, 16)
			return
		}
		e.currentTarget.value = numericStringMask(e.target.value, "(###) ###-####")
			// Replaces so we don't add characters past the end of the string,
			// and so the user can delete characters
			.replace(/-$/, "") // changes '(123) 456-' to '(123) 456'
			.replace(/\) $/, "") // changes '(11)' to '(11'
			.replace(/\($/, "") // changes '(' to ''
	},
	/**
	 * A regex for a phone number
	 * - must be 10 digits if no country code
	 * - must be 10-15 digits if country code
	 */
	validator: (str: string) => {
		if (str.startsWith("+")) {
			const isValid = /^\+?\d{10,15}$/.test(str)
			if (!isValid) return "Phone number must be 10-15 digits"
		}
		const isValid = /^\(\d{3}\)\s\d{3}-\d{4}$/.test(str)
		if (!isValid) return "Phone number must be 10 digits"
	},
}
