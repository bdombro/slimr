# 🪶 @slimr/forms [![npm package](https://img.shields.io/npm/v/@slimr/forms.svg?style=flat-square)](https://npmjs.org/package/@slimr/forms)

A slim (< 1kB), minimalistic form hook that returns a Form component and reactive form state.

The Form component:

- optimizes for vanilla, uncontrolled input elements
- wraps onSubmit to
  - auto call event.preventsDefault()
  - track submitting, error, submitted, accepted state
  - auto catches errors if elements have an `error` attribute
- < 1kB when bundled+gzipped with a broader application

## Context

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css) - Framework agnostic css-in-js features inspired by the popular Emotion lib
- [@slimr/forms](https://www.npmjs.com/package/@slimr/forms) - A minimalistic form hook
- [@slimr/markdown](https://www.npmjs.com/package/@slimr/markdown) - A simple component and slim markdown-to-html parser
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths) - A basic Icon component and Material Design icon svg paths, code-split by path.
- [@slimr/react](https://www.npmjs.com/package/@slimr/react) - A collection of useful 1st and third party react components, hooks, and util. Includes
  several other @slimr libs for convenience
- [@slimr/router](https://www.npmjs.com/package/@slimr/router) - A novel React-web router that supports stack routing
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled) - css-in-js features inspired by the popular styled-components and Chakra-UI libs
- [@slimr/swr](https://www.npmjs.com/package/@slimr/swr) - A React hook for fetching data that supports stale-while-refresh eager rendering
- [@slimr/util](https://www.npmjs.com/package/@slimr/util) - Framework agnostic Javascript polyfills

## Usage

- [Code Sandbox - sleek login form](https://codesandbox.io/s/phone-tel-input-hjr27s?file=/src/App.tsx)
- [Code Sandbox - kitchen sink](https://codesandbox.io/s/useform-4sncgj?file=/src/App.tsx)
- kitchen sink - `../demo/src/pages/form.tsx`

## API

### FormError

An extension of Error that accepts an `errorSet` as a constructor property. It is used to share error context with `useForm`. When thrown from within an onSubmit handler, `useForm` will set `errorSet` to the `error` state.

```typescript
throw new FormError({form: 'Please add a value for the name field', name: 'This field is required'})
```

### useForm

A hook that returns a Form component and reactive form state.
