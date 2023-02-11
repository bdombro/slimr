import {addCss, styled} from '@slimr/styled'
import {useEffect, useState} from 'react'

// Can add arbitrary css to the document head
addCss(`
	body {
		background: black;
    color: lightgray;
  }
`)

// Create primitive components if you like

const ButtonP = styled.button`
  bg: red;
  c: white;
`
/** The main react app */
export function App() {
  const on = useOscillator()

  return (
    <ButtonP
      _css={`
        --font-weight: [bold, null, initial];
      `}
      id="my-button"
      _fontWeight="var(--font-weight)"
      _mx={[30, null, 0]}
      _textTransform={on ? 'uppercase' : 'uppercase'}
      _py={20}
      _dark={{
        bg: 'darkblue',
      }}
      _hover={{
        bg: 'lightblue',
      }}
    >
      Click Me
    </ButtonP>
  )
}

/** A hook that just return a boolean that oscilates on/off */
function useOscillator() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const interval = setInterval(() => {
      setOn(on => !on)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return on
}
