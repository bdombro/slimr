import {areEqualDeep} from './equality.js'

it('returns the isEqual between two objects', () => {
  // negatives
  expect(areEqualDeep(NaN, '')).toBeFalsy()
  expect(areEqualDeep('', 1)).toBeFalsy()
  expect(areEqualDeep(NaN, 1)).toBeFalsy()
  expect(areEqualDeep(1, 2)).toBeFalsy()
  expect(areEqualDeep({foo: 'bar'}, {})).toBeFalsy()
  expect(areEqualDeep({}, {foo: 'bar'})).toBeFalsy()
  expect(areEqualDeep(['dsf'], [])).toBeFalsy()
  expect(areEqualDeep({foo: 'bar', bar: []}, {foo: 'bar', bar: ['baz']})).toBeFalsy()
  expect(areEqualDeep(['dsf', {foo: 'boo'}], ['dsf', {foo: 'bar'}])).toBeFalsy()

  // positives
  expect(areEqualDeep(NaN, NaN)).toBeTruthy()
  expect(areEqualDeep(1, 1)).toBeTruthy()
  expect(areEqualDeep('1', '1')).toBeTruthy()
  expect(areEqualDeep({foo: 'bar', bar: ['baz']}, {foo: 'bar', bar: ['baz']})).toBeTruthy()
  expect(areEqualDeep(['dsf', {foo: 'bar'}], ['dsf', {foo: 'bar'}])).toBeTruthy()
})
