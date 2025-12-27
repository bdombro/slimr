# 🪶 @slimr/util [![npm package](https://img.shields.io/npm/v/@slimr/util.svg?style=flat-square)](https://npmjs.org/package/@slimr/util)

A set of slim JS polyfills with tree-shaking support

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

## Exports

### appendElement, appendLink, appendScript, appendStyle

Append a link, script, style, or ANY element to the head of the document if not already added

### areEqualDeep, areNotEqualDeep

Deep compare methods

- Shallow is faster than deep if it's "good enough" for your use case
- Dependendencies: `./src/equality-deep.ts`, [npm:fast-deep-equal](https://www.npmjs.com/package/fast-deep-equal)
- Note: Imperfect on Classes
- Tip: For debugging, try using areEqualDebug/areNotEqualDebug

### areEqualShallow, areNotEqualShallow

Shallow compare methods

- Shallow is faster than deep if it's "good enough" for your use case
- Dependendencies: `./src/equality-deep.ts`, [npm:fast-shallow-equal](https://www.npmjs.com/package/fast-shallow-equal)
- Note: Imperfect on Classes and less perfect than deep
- Tip: For debugging, try using areEqualDebug/areNotEqualDebug

### copy

Deeply copy two objects

- Is imperfect on classes.
- Extends [npm:copy-anything](https://www.npmjs.com/package/copy-anything), which has a full list of options.

```typescript
const obj1 = [
  {foo: 'bar', arr: [2]},
  {foo: 'bar2', arr: [3]},
]
const obj2 = copy(obj1)
```

### createUid

Generate a random string of 12 characters, provided by [npm:nanoid](https://www.npmjs.com/package/nanoid).

```typescript
const id = createUid()
```

### debounce

Don't call a function until a certain amount of time has passed without it being called.

In other words, we intentionally delay invoking `fnc` until after `delay` milliseconds have elapsed since the last time the debounced. If it gets called again, we cancel the previous call and start a new timer.

- If you want more features, like arg diffing and return values, see @slimr/util/memoize
- Dependences: `./src/debounce.ts`

```typescript
const fnc = async () => 2
const debounced = debounce(fnc, 250)
debounced()
debounced()
debounced()
await sleep(250)
debounced()
debounced()
debounced()
await sleep(250)
// fnc would only be called twice
```

### diff, addedDiff, deletedDiff, updatedDiff, detailedDiff

Deep compare methods provided by [npm:deep-object-diff](https://www.npmjs.com/package/deep-object-diff), which return an object describing the differencees between two objs.

### highlightCodeElements

Highlight code elements using highlight.js

- Is async + lazy loaded to avoid loading highlight.js on pages that don't need it bc is large.
- Dependendencies: `./src/code-highlight-lazy.ts`, [npm:highlight.js](https://www.npmjs.com/package/highlight.js)

### formToValues

Extracts form values from a `form` element, such as e.target from form.onSubmit

- An alternative to the FormData api, aiming to be more predictable, flexible and less awkward.
  - For example, FormData has not great way to enumerate all fields (even ones with undefined
    values) or multiple checkboxes or multi selects.
- Handles text, number, checkboxes, radio buttons, textarea, select
- Value = array if multiple inputs with same 'name', such as checkboxes
- Converts US phone numbers to international format
- Usage: [Code Sandbox](https://codesandbox.io/s/form-to-json-y7cs3t?file=/src/App.tsx)
- Limitation: Can't handle complex forms (multipart/form-data encoding)
- Dependencies: `./src/form-to-values.ts`

Why not FormData?

- FormData returns an iterator, vs formToJson a simple dictionary object
- For checkbox inputs, FormData returns 'on' when checked and _nothing at all_ when unchecked
- For number inputs, FormData returns a string instead of a number
- For array values such as select w/ multiple, FormData returns a seperate key/value for every value instead of key=array of values.

### hash32 and hash64

Quickly converts any plain object, string, number, and more to a 32bit/64bit hash number or string

- Uses a fast and tiny approach, which has higher likelyhood of collision than
- Best for smaller hash tables
- Not good enough for UUIDs
- Dependencies: `./src/hash.ts`

```typescript
hash32('hello world') // 1047750623
hash32('hello world', true) // 'hbsxjz'
hash32({hello: 'world'}) // 141133545
hash64('hello world') // 927946135
hash64('hello world', true) // 'fch3tj'
hash64({hello: 'world'}) // 1139059049
```

> _NOTE_ hash64 is not a true 64 bit hash and has higher collision odds than a true 64 bit hash.

Collisions are possible and likelyhood increases with the number of hashes.

Ideal collision odds:

- 100 32bit hashes = 1/1,000,000
- 927 32bit hashes = 1/10,000
- 1921 64bit hashes = 1/10,000,000,000,000 = 1/10 trillion = ~odds of a meteor hitting your house

References

- <https://stackoverflow.com/a/34842797>
- <https://stackoverflow.com/a/22429679>
- <https://security.stackexchange.com/questions/209882/can-a-32-bit-hash-be-made-into-a-64-bit-hash-by-calling-it-twice-with-different/210049#210049>
- <https://preshing.com/20110504/hash-collision-probabilities/>
- <https://www.ilikebigbits.com/2018_10_20_estimating_hash_collisions.html>

### is-whats

A set of is-type methods to easily check if a value is a type.

- Is provided by [npm:is-what](https://www.npmjs.com/package/is-what), which has a full list of options.

```typescript
isPositiveNumber(-2) // false
isFullArray([]) // false
isEmptyArray([]) // true
```

### mapApplyMaxSize

Limit the size of a map by evicting the least-recently-used (aka LRU) items. Works by monkey-patching
the get and set of a map instance

- Dependencies: `./src/map-apply-max-size.ts`, `./src/stringify.ts`

```typescript
const t = mapApplyMaxSize(new Map(), 2)
t.set('a', 1)
t.set('b', 2)
t.set('a', 3) // refreshes 'a'
t.set('c', 3) // should evict 'b'
expect(t.get('b')).toBeUndefined()
t.set('d', 4) // should evict 'a'
expect(t.get('a')).toBeUndefined()
t.get('c')
t.set('e', 5) // should evict 'd'
expect(t.get('d')).toBeUndefined()
```

### memoize

A memoization wrapper with ttl expiration for cache hits.

- Aka a feature rich debounce. If you only need basic debounce, see @slimr/util/debounce.
- Compared to other memoization algs (fast-memoize, nano-memoize), is much simpler,
  shorter, easier to fork/enhance while less perfect and slower for primitive args.
- Dependences: `./src/memoize.ts`

### merge, mergeAndCompare, mergeAndConcat

Deeply merge objects or arrays in a familiar pattern to Object.assign

- Is imperfect on classes.
- Extends [npm:merge-anything](https://www.npmjs.com/package/merge-anything), which has a full list of options.

```typescript
merge({foo: 'bar', arr: [2]}, {foo: 'bar2', arr: [3]}) // {foo: bar2, arr: [3]}
mergeAndConcat({foo: 'bar', arr: [2]}, {foo: 'bar2', arr: [3]}) // {foo: bar2, arr: [2, 3]}

mergeAndCompare(concatStrings, {name: 'John'}, {name: 'Simth'})
// returns { name: 'JohnSmith' }

function concatStrings(originVal, newVal, key) {
  if (typeof originVal === 'string' && typeof newVal === 'string') {
    // concat logic
    return `${originVal}${newVal}`
  }
  // always return newVal as fallback!!
  return newVal
}
```

### numericStringMask

Applies a mask to a string of numbers, helpful for phone numbers

Grabs all of the numbers out of str into an array, then assembles
the mask and replaces the '#' with the numbers in order

```typescript
numericStringMask('1234567890', '(###) ### - ####') // (123) 456 - 7890
numericStringMask('1234567890', '(###) ### - ####') // (123) 456 - 7890
numericStringMask('(123)abc45678-90', '(###) ### - ####') // (123) 456 - 7890
numericStringMask('1234567890', '(###) ###-####') // (123) 456-7890
numericStringMask('11900567890', '(##) #####-####') // (11) 90056-7890

// react input usage
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.currentTarget.value = numericStringMask(e.target.value, '(###) ###-####')
    // Replaces so we don't add characters past the end of the string,
    // and so the user can delete characters
    .replace(/-$/, '') // changes '(123) 456-' to '(123) 456'
    .replace(/\) $/, '') // changes '(11)' to '(11'
    .replace(/\($/, '') // changes '(' to ''
}
```

### setPageMeta

Allows setting common page attrs.

- Intelligently use the attrs, only setting if changed
- Resets back to initial if omitted, based on initial introspection
- Stores element handles in memory to remove need to query the dom
  on every update

> Note: Set `window.setPageMetaSkip=true` to disable setPageMeta for testing

Parameters:

- `title` - Sets title, meta:og:title. Is postfixed by ' - {siteName}'
- `siteName` - Sets meta:og:site_name
- `description` - Sets meta:description
- `image` - Sets meta:og:image
- `locale` - Sets meta:og:local

Assumption: The page should already have the following meta tags, to be used as defaults:

```html
<title>React Template</title>
<meta property="og:title" content="React template" />
<meta property="og:site_name" content="React Template" />
<meta property="og:locale" content="en_US" />
<link rel="canonical" href="https://react-template.com" />
<meta name="description" content="A template to build tiny Preact applications" />
<meta property="og:description" content="A template to build tiny React applications" />
<meta property="og:url" content="https://github.com/bdombro/react-template" />
<meta property="og:image" content="https://preact-template.com/apple-touch-icon.png" />
```

Usage:

```typescript
const {description} = setPageMeta({
  title: `Hello World`,
  description: 'This page is awesome',
})
```

### stringify

A safe JSON.stringify wrapper that limits recursion

- Dependencies: `./src/stringify.ts`

### toCamelCase

Convert a string to camelCase

```typescript
toCamelCase('hello_world') // helloWorld
```

### toKebabCase

Convert a string to kebab-case

```typescript
toCamelCase('hello_world') // hello-world
```
