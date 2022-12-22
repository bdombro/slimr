import { useEffect, useRef, useState } from "preact/hooks";
import styled, { css } from "@styled-components-lite/preact";

// Add some global styles
css`
  body {
    color: lightgray;
  }
`;

// Also works with tab syntax (tss)
css`
	body
		background: black
	@media (width > 500px)
		body
			background: #333
`;

css`
	{/* Now for some ugly code!! */}
	
	h1,
	{/* multi-line
			comment 
	*/}
	h2,
	h3,h4,
	h5

		color: white
	
`;

let renderCount = 0;

export function App() {
  const on = useOn();
  const [ref, width] = useWidth();

  let pColor = "";
  if (width > 400 && width > 800) {
    pColor = on ? "white" : "pink";
  } else {
    pColor = on ? "white" : "red";
  }

  // Feel free to declare styled components inside components!

  // A basic div with css template string
  const Div = styled.div`
    :self {
      color: #55f;
    }
  `;

  // A basic div with tss string and nested component
  const Container = styled.div(`
    :self
      container-type: inline-size
      max-width: 500px
    :self ${Div}
      background: white
  `);

  // A basic div with tab syntax (tss) template string and dynamic color
  const Div2 = styled.div`
		:self
			color: ${pColor}
		@container (width > 400px) and (width > 800px)
			:self
				color: ${pColor}
	`;

  // An extension of Div2 with tss template string
  const Div3 = styled(Div2)`
    :self
      background: black
      padding: 10px
  `;
  // An extension of Div3 with css string
  const Div4 = styled(Div3)(":self { font-size: 30px; }");

  return (
    <Container forwardRef={ref as any}>
      <Div>This should be blue font with white background</Div>
      <h3>THIS SHOULD BE WHITE</h3>
      <Div4 style={{ textTransform: "uppercase" }}>
        This should be
        <ul>
          <li>uppercase</li>
          <li>font-size 30</li>
          <li>padding: 10</li>
          <li>background: black</li>
          <li>font color: {pColor}</li>
        </ul>
      </Div4>
      <p>RenderCount: {renderCount++}</p>
      <p>Container Width: {width}</p>
      <p>
        CSS Classes:{" "}
        {document
          .getElementById("styled-components-lite")
          ?.innerHTML.match(/\.s/g)?.length ?? 0}
      </p>
    </Container>
  );
}

/** A hook that just return a boolean that oscilates on/off */
function useOn() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setOn((on) => !on);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return on;
}

function useWidth() {
  const ref = useRef<HTMLElement>();
  const getWidth = () => ref.current?.clientWidth ?? 0;
  const [width, setWidth] = useState(getWidth());

  useEffect(() => {
    const upsertWidth = () => {
      const newWidth = getWidth();
      if (newWidth !== width) setWidth(getWidth());
    };
    const int = setInterval(upsertWidth, 500);
    return () => clearInterval(int);
  }, []);

  return [ref, width];
}
