/**
 * Main entry point to the application.
 *
 * Normally in the application we write directly for React, but this file
 * we don't because HMR doesn't work right when using preact/compat. If you
 * really want to use React, you can comment out the React version below:
 *
 * ```typescript
 * import React from 'react'
 * import ReactDOM from 'react-dom/client'
 * import {App} from './app'
 * ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
 *   <React.StrictMode>
 *     <App />
 *   </React.StrictMode>
 * )
 * ```
 */
import { render } from "preact"

import { App } from "./app"

render(<App />, document.querySelector("#root")!)
