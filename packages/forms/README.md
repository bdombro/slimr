# 🪶 @slimr/forms [![npm package](https://img.shields.io/npm/v/@slimr/forms.svg?style=flat-square)](https://npmjs.org/package/@slimr/forms)

A slim (< 1kB), enhanced HTML form with auto-disabling, auto-reset, error handling, more JS events, and context to its children.

- optimizes for vanilla, uncontrolled input elements
- does not cause re-renders
- disables form elements while submitting
- can auto-reset the form is desired
- uses browser accessibility APIs to share errors to form elements
- wraps onSubmit to
  - auto call event.preventsDefault()
  - pass form values as an Object
- provide JS events and React context for rejected, submitted, accepted states
- < 1kB when bundled+gzipped with a broader application

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

## Usage

- [Code Sandbox - sleek login form](https://codesandbox.io/s/phone-tel-input-hjr27s?file=/src/App.tsx)
- [Code Sandbox - kitchen sink](https://codesandbox.io/s/useform-4sncgj?file=/src/App.tsx)
- kitchen sink - `../demo/src/pages/form.tsx`

## API

### SForm

An enhanced HTML form with auto-disabling, auto-reset, error handling, more JS events, and context to its children.

### SFormError

An extension of Error that accepts an `errorSet` as a constructor property. It is used to share errors to form elements

```typescript
throw new FormError({field1: 'This field is invalid'})
```

### useSFormContext

A hook to get the current state of the form
