import { useEffect, useState } from 'react'
import css, { addCss } from '@ustyle/css'
import styled from '@ustyle/styled-react'
import { Li } from '@ustyle/props-react'

addCss`
	body {
		background: black;
    color: lightgray;
  }
`

let renderCount = 0

export function App() {
  const on = useOscillator()
  const pColor = on ? 'gray' : 'red'

  const D = styled.div`
    background: white;
    &:hover {
      font-weight: bold;
    }
    @media (width > 500px) {
      font-size: 20px;
    }
  `
  const D2 = styled(D)`
    color: ${pColor};
  `

  const body = (
    <>
      This should be
      <ul>
        <li>font-size: inherit when lt 500, 20px when gt</li>
        <li>font-weight bold on hover</li>
        <li>background: white</li>
        <li>font color: {pColor}</li>
        <Li
          css={`
            font-size: 24px;
          `}
          zx={{
            py: [10, 20, 30],
          }}
        >
          font: blue @ 24px
        </Li>
      </ul>
    </>
  )

  return (
    <>
      <h3>This font should be gray with black background</h3>
      <div
        className={css`
          background: white;
          color: ${pColor};
          &:hover {
            font-weight: bold;
          }
          @media (width > 500px) {
            font-size: 20px;
          }
        `}
      >
        {body}
      </div>
      <D2>{body}</D2>
      <p>RenderCount: {renderCount++}</p>
      <p>CSS Classes: {document.getElementById('ustyle')?.innerHTML.match(/\.s/g)?.length ?? 0}</p>
    </>
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
