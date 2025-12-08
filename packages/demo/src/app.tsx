import { Switch } from "@slimr/router"

import "./foundation"
import { router } from "./router"

/**
 * The main app component
 */
export function App() {
	return (
		<div data-testid="appComponent">
			<Switch router={router} />
		</div>
	)
}
