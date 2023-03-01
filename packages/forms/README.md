# 🪶 @slimr/forms [![npm package](https://img.shields.io/npm/v/@slimr/forms.svg?style=flat-square)](https://npmjs.org/package/@slimr/forms)

A slim (< 500B), minimalistic form hook that returns a Form component and reactive form state.

The Form component:

- optimizes for vanilla, uncontrolled input elements
- wraps onSubmit to
  - auto call event.preventsDefault()
  - track submitting, error, submitted, accepted state
- < 500B when bundled+gzipped with a broader application

## Context

`@slimr` is a set of slim React (hence '@slimr') libs:

- [@slimr/css](https://www.npmjs.com/package/@slimr/css) - Framework agnostic css-in-js features inspired by the popular Emotion lib
- [@slimr/forms](https://www.npmjs.com/package/@slimr/forms) - A minimalistic form hook
- [@slimr/hooks](https://www.npmjs.com/package/@slimr/hooks) - A collection of useful 1st and third party react hooks
- [@slimr/markdown](https://www.npmjs.com/package/@slimr/markdown) - A simple component and slim markdown-to-html parser
- [@slimr/mdi-paths](https://www.npmjs.com/package/@slimr/mdi-paths) - A basic Icon component and Material Design icon svg paths, code-split by path.
- [@slimr/router](https://www.npmjs.com/package/@slimr/router) - A novel React-web router that supports stack routing
- [@slimr/styled](https://www.npmjs.com/package/@slimr/styled) - css-in-js features inspired by the popular styled-components and Chakra-UI libs
- [@slimr/swr](https://www.npmjs.com/package/@slimr/swr) - A React hook for fetching data that supports stale-while-refresh eager rendering
- [@slimr/util](https://www.npmjs.com/package/@slimr/util) - Framework agnostic Javascript polyfills

## API

### FormError

An extension of Error that accepts an `errorSet` as a constructor property. It is used to share error context with `useForm`. When thrown from within an onSubmit handler, `useForm` will set `errorSet` to the `error` state.

```typescript
throw new FormError({form: 'Please add a value for the name field', name: 'This field is required'})
```

### useForm

A hook that returns a Form component and reactive form state.

```tsx
import {FormError, useForm} from '@slimr/forms'
import {formToValues} from '@slimr/util'

function MyForm() {
  const { Form, submitting, submitted, accepted, errors} = useForm()

  const onSubmit = async (e: React.FormEventHandler<HTMLFormElement> => {
    const vals = formToJson(e.target as HTMLFormElement)
    const errors: Record<string, string> = {}
    if (!vals.name) {
      errors.name = 'Name is required'
    }
    if (!vals.terms) {
      errors.checkbox = 'You must agree to the terms'
    }
    if (Object.keys(errors).length) {
      throw new FormError(errors)
    }
  }

  return (
    <Form onSubmit={onSubmit}>
      <input disabled={submitting || accepted} name="name" />
      <div>{errors.name}<div>
      <input disabled={submitting || accepted} name="terms" type="checkbox" />
      <div>{errors.terms}<div>
      <button type="submit">Submit</button>
      <button type="reset">Reset</button>
    </Form>
  )
}
```
