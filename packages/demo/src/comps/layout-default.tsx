import { router as r } from "~/router"

/**
 * A layout with a header and a main section
 */
export function Layout({ children }: { children: React.ReactNode }) {
	const navitems = [
		{ name: "Home", path: r.routes.index.path, exact: true },
		{ name: "Form", path: r.routes.form.path, exact: true },
		{ name: "Stack1", path: r.routes.stack1.path },
		{ name: "Planets", path: r.routes.planets.path },
	]
	return (
		<Div _d="flex" _flexDirection="column" _h="var(--dvh)">
			<Header _flex={0} _w="100%">
				<Nav
					_bg="#aaa"
					_border="8px solid #ffffff77"
					_boxSizing="border-box"
					_px={4}
					_ta="center"
					_dark={{ bg: "#555" }}
				>
					{navitems.map((item) => (
						<A
							className="small"
							key={item.name}
							href={item.path}
							_bg={
								(
									item.exact
										? item.path === location.pathname
										: location.pathname.startsWith(item.path)
								)
									? "gray"
									: undefined
							}
							_c="var(--color-fg)"
							_d="inline-block"
							_p={10}
							_hover={{ bg: "lightblue" }}
						>
							{item.name}
						</A>
					))}
				</Nav>
			</Header>

			<Main _flex={1} _opacity={0} _overflowY="auto" _transition="opacity .05s">
				{children}
			</Main>
		</Div>
	)
}

Layout.Section = function LayoutSection({
	children,
	innerProps,
	...outerProps
}: Parameters<typeof Section>[0] & { innerProps?: Parameters<typeof Div>[0] }) {
	return (
		<Section _p={16} {...outerProps}>
			<Div _maxW={800} _mx="auto" {...innerProps}>
				{children}
			</Div>
		</Section>
	)
}
