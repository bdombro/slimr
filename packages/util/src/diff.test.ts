import {diff} from './diff'

it('returns the diff between two objects', () => {
  // negatives
  expect(diff(NaN, '')).toEqual('')
  expect(diff('', 1)).toEqual(1)
  expect(diff(NaN, 1)).toEqual(1)
  expect(diff(1, 2)).toEqual(2)
  expect(diff({foo: 'bar'}, {})).toMatchObject({foo: undefined})
  expect(diff({}, {foo: 'bar'})).toMatchObject({foo: 'bar'})
  expect(diff(['dsf'], [])).toMatchObject({'0': undefined})
  expect(diff({foo: 'bar', bar: []}, {foo: 'bar', bar: ['baz']})).toMatchObject({
    bar: {'0': 'baz'},
  })
  expect(diff(['dsf', {foo: 'boo'}], ['dsf', {foo: 'bar'}])).toMatchObject({'1': {foo: 'bar'}})

  // positives
  expect(diff(NaN, NaN)).toMatchObject({})
  expect(diff(1, 1)).toMatchObject({})
  expect(diff('1', '1')).toMatchObject({})
  expect(diff({foo: 'bar', bar: ['baz']}, {foo: 'bar', bar: ['baz']})).toMatchObject({})
  expect(diff(['dsf', {foo: 'bar'}], ['dsf', {foo: 'bar'}])).toMatchObject({})
})
