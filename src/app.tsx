import {h} from 'preact'
import {useEffect, useState} from 'preact/hooks'
import tstyled, {Container, tss} from './tstyled'
import styled, {a, css} from './styled'

tss`
	body
		background: black
	@media (width > 500px)
		body
			background: #333
`

let renderCount = 0

// TODO: Hot-reload support
// TODO: fluid font
// TODO: Rename to chakra-slim
export function App() {
	const on = useOn()

	let P = styled.a`
		:root
			color: ${on ? 'white' : 'red'}
		@container (width > 400px) and (width > 800px)
			:root
				color: ${on ? 'white' : 'pink'}
	`
	return (
		<Container>
			<P>
				{on ? 'on' : 'off'} {renderCount++}
			</P>
		</Container>
	)
}

/** A hook that just return a boolean that oscilates on/off */
function useOn() {
	const [on, setOn] = useState(false)
	useEffect(() => {
		const interval = setInterval(() => {
			setOn((on) => !on)
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	return on
}
