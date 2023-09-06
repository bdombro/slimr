import {vi} from 'vitest'

import {debounce} from './debounce.js'

it('is called exactly twice', async () => {
  vi.useFakeTimers()
  let counter = 0
  const f = vi.fn(async () => ++counter)
  const d = debounce(f, 100)
  d()
  d()
  d()
  vi.runAllTimers()
  d()
  d()
  d()
  vi.runAllTimers()
  expect(f).toBeCalledTimes(2)
})
