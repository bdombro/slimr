const text =
	"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, or"

/**
 * A component that renders a lot of paragraphs
 */
export function Filler() {
	return (
		<>
			{Array(100)
				.fill(0)
				.map((_, i) => (
					<p key={`filler-${i}`}>{text}</p>
				))}
		</>
	)
}
