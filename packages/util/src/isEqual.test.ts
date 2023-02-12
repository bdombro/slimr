import {isEqual} from './isEqual'

it('returns the isEqual between two objects', () => {
  // negatives
  expect(isEqual(NaN, '')).toBeFalsy()
  expect(isEqual('', 1)).toBeFalsy()
  expect(isEqual(NaN, 1)).toBeFalsy()
  expect(isEqual(1, 2)).toBeFalsy()
  expect(isEqual({foo: 'bar'}, {})).toBeFalsy()
  expect(isEqual({}, {foo: 'bar'})).toBeFalsy()
  expect(isEqual(['dsf'], [])).toBeFalsy()
  expect(isEqual({foo: 'bar', bar: []}, {foo: 'bar', bar: ['baz']})).toBeFalsy()
  expect(isEqual(['dsf', {foo: 'boo'}], ['dsf', {foo: 'bar'}])).toBeFalsy()

  // positives
  expect(isEqual(NaN, NaN)).toBeTruthy()
  expect(isEqual(1, 1)).toBeTruthy()
  expect(isEqual('1', '1')).toBeTruthy()
  expect(isEqual({foo: 'bar', bar: ['baz']}, {foo: 'bar', bar: ['baz']})).toBeTruthy()
  expect(isEqual(['dsf', {foo: 'bar'}], ['dsf', {foo: 'bar'}])).toBeTruthy()
})
