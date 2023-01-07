import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { App } from './App.js'

it('renders', () => {
  render(<App />)
  expect(
    screen.getByRole('button', {
      name: /Click Me/,
    })
  ).toBeInTheDocument()
})
