import {router as r} from '~/router'

/**
 * A layout with a header and a main section
 */
export function Layout({children}: {children: React.ReactNode}) {
  const navitems = [
    {name: 'Home', path: r.routes.index.path, exact: true},
    {name: 'Form', path: r.routes.form.path, exact: true},
    {name: 'Stack1', path: r.routes.stack1.path},
    {name: 'Planets', path: r.routes.planets.path},
  ]
  return (
    <div style={{display: 'flex', flexDirection: 'column', height: 'var(--dvh)'}}>
      <header style={{flex: 0, width: '100%'}}>
        <Nav
          _bg="#aaa"
          _border="8px solid #ffffff77"
          _boxSizing="border-box"
          _px={4}
          _ta="center"
          _dark={{bg: '#555'}}
        >
          {navitems.map(item => (
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
                  ? 'gray'
                  : undefined
              }
              _c="var(--color-fg)"
              _d="inline-block"
              _p={10}
              _hover={{bg: 'lightblue'}}
            >
              {item.name}
            </A>
          ))}
        </Nav>
      </header>

      <main style={{flex: 1, opacity: 0, overflowY: 'auto', transition: 'opacity .05s'}}>
        {children}
      </main>
    </div>
  )
}

Layout.Section = function LayoutSection({
  children,
  innerProps,
  ...outerProps
}: Parameters<typeof Section>[0] & {innerProps?: Parameters<typeof Div>[0]}) {
  return (
    <Section _p={16} {...outerProps}>
      <Div _maxW={800} _mx="auto" {...innerProps}>
        {children}
      </Div>
    </Section>
  )
}
