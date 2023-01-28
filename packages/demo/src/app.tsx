import { useEffect, useState } from 'react'
import styled, { addCss } from '@ustyle/styled/withHtmlTags'

// Can add arbitrary css to the document head
addCss(`
	body {
		background: black;
    color: lightgray;
  }
`)

// Create primitive components if you like
interface ButtonProps extends Omit<JSX.IntrinsicElements['button'], 'id'> {
  id: JSX.IntrinsicElements['button']['id'] // make required
}
function Button(props: ButtonProps) {
  return (
    <button
      {...props}
      onClick={(e) => {
        console.log(`Button ${props.id} clicked`)
        props.onClick?.(e)
      }}
    />
  )
}
const ButtonP = styled(Button)`
  bg: red;
  c: white;
  w: [100%, null, inherit];
`

const Box = styled.div`
  pos: relative;
`

export function App() {
  const on = useOscillator()

  return (
    <Box>
      <ButtonP
        css={`
          --font-weight: [bold, null, initial];
        `}
        id="my-button"
        zx={{
          fontWeight: 'var(--font-weight)',
          mx: [30, null, 0],
          textTransform: on ? 'uppercase' : 'uppercase',
          py: 20,
        }}
        _hover={{
          bg: 'lightblue',
        }}
      >
        Click Me
      </ButtonP>
    </Box>
  )
}

/** A hook that just return a boolean that oscilates on/off */
function useOscillator() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const interval = setInterval(() => {
      setOn((on) => !on)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return on
}
