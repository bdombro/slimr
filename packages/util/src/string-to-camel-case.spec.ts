import {toCamelCase} from './string-to-camel-case.js'

it('converts string to camel case', () => {
  expect(toCamelCase('')).toBe('')
  expect(toCamelCase('foo')).toBe('foo')
  expect(toCamelCase('foo-bar')).toBe('fooBar')
  expect(toCamelCase('foo bar')).toBe('fooBar')
  expect(toCamelCase('foo Bar')).toBe('fooBar')
  expect(toCamelCase('foo-bar-baz')).toBe('fooBarBaz')
  expect(toCamelCase('foo_bar_baz')).toBe('fooBarBaz')
  expect(toCamelCase('foo bar baz')).toBe('fooBarBaz')
  expect(toCamelCase('foo bar_baz')).toBe('fooBarBaz')
  expect(toCamelCase('fooBarBaz')).toBe('fooBarBaz')
})
