import { SForm, useSFormContext } from "@slimr/react"

import { Layout } from "~/comps/layout-default"
import { GenericError, InputBox, RadioBox, SelectBox } from "~/foundation/forms"

export default function FormPage() {
	return (
		<Layout>
			<Layout.Section>
				<h1>Form Page</h1>
				<FormKitchenSink />
			</Layout.Section>
		</Layout>
	)
}

const FormKitchenSink = () => {
	return (
		<SForm onSubmit={(_, vals) => console.log(vals)}>
			{[
				"checkbox",
				"color",
				"date",
				"email",
				"number",
				"password",
				"search",
				"text",
				"textarea",
				"tel",
				"url",
			].map((type) => (
				<InputBox key={type} label={type} name={type} type={type} required />
			))}
			<RadioBox
				label="Radios"
				name="radio1"
				options={[
					{ label: "Choice 1", value: "choice1" },
					{ label: "Choice 2", value: "choice2" },
					{ label: "Choice 3", value: "choice3" },
				]}
				required
			/>
			<SelectBox
				label={"Select Single"}
				name="select1"
				options={[
					{ label: "--", value: "" },
					{ label: "Choice 1", value: "choice1" },
					{ label: "Choice 2", value: "choice2" },
					{ label: "Choice 3", value: "choice3" },
				]}
				required
			/>
			<SelectBox
				label={"Select multiple"}
				multiple
				name="select2"
				options={[
					{ label: "Choice 1", value: "choice1" },
					{ label: "Choice 2", value: "choice2" },
					{ label: "Choice 3", value: "choice3" },
				]}
				required
			/>
			<FormFooter />
			<RenderCheck />
		</SForm>
	)
}

function RenderCheck() {
	console.log(`render-count:${++renderCount}`)
	return null
}
let renderCount = 0

const FormFooter = () => {
	const { submitting, accepted, rejected } = useSFormContext()

	return (
		<>
			<GenericError error={rejected && "Issues found. Please correct and retry."} />
			<button className="left" type="submit">
				{accepted ? "Success!" : submitting ? "Submitting..." : "Submit"}
			</button>
			<button className="tertiary middle" disabled={submitting} type="reset">
				Reset
			</button>
			<button
				className="tertiary right"
				onClick={(e) => {
					const form = e.currentTarget.closest("form") as HTMLFormElement
					const formElements = [...(form.elements as unknown as HTMLInputElement[])].filter(
						(e) => e.type !== "reset",
					)
					formElements.forEach((e) => (e.disabled = true))
				}}
				type="button"
			>
				Disable
			</button>
		</>
	)
}
