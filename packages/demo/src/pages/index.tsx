import { Markdown } from "@slimr/markdown"
import { setPageMeta } from "@slimr/util"

import { Layout } from "~/comps/layout-default"
import { router } from "~/router"

/**
 * A demo of a home page
 */
export default function Index() {
	const { title, description } = setPageMeta({ title: "Home" })
	return (
		<Layout>
			<Layout.Section>
				<h1>{title}</h1>
				<p>{description}</p>
				<p>
					<button
						type="button"
						onClick={() => {
							router.goto(router.routes.planetsByPage.toPath({ page: "2" }))
						}}
					>
						Test nav with string
					</button>
					<button
						type="button"
						onClick={() => {
							router.goto(router.routes.planetsByPage, { page: "2" })
						}}
					>
						Test nav with url params
					</button>

					<button
						type="button"
						onClick={() => {
							router.goto(router.routes.form, { foo: "bar" })
						}}
					>
						Test nav with query params
					</button>
				</p>
				<p>
					<a href={router.routes.planetsByPage.toPath({ page: "2" })}>
						Goto planetsByPage 2, which should also clear the planet's stack
					</a>
				</p>
				<p>
					<a href={`${router.routes.stack1Inner.path}/inner`}>
						Goto inner stack page to test that it clears the stack
					</a>
				</p>
				<fieldset style={{ marginBottom: 20 }}>
					<legend>Icons:</legend>
					<Icon name="alert" />
					<Icon name="close" />
					<Icon name="error" />
					<Icon name="info" />
					<Icon name="success" />
				</fieldset>
				<fieldset>
					<legend>Markdown example:</legend>
					<Markdown
						src={`
              # H1
              ## H2
              ### H3
              #### H4
              ##### H5
              ###### H6

              **Bold** *Italic* [Link](https://google.com) email@email.com

              ***

              > Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, or

              
              ***

              - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, or
              - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, or
              - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, or

              ***

              1. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, or
              2. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, or
              3. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, or
          `}
					/>
				</fieldset>
			</Layout.Section>
		</Layout>
	)
}
