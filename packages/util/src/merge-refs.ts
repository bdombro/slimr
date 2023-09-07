/**
 * Merge React refs so that multiple refs can be used on a single element. Is
 * used to merge refs from a forwardRef and a local ref from useRef.
 *
 * Credits: react-merge-refs
 *
 * @example
 * ```typescript
 * const MyComponent = forwardRef((props, ref1) => {
 *  const ref2 = useRef(null)
 *  return (<div ref={mergeRefs([ref1, ref2])} />)
 * })
 * ```
 **/
export function mergeRefs<T = any>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return value => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(value)
      } else if (ref != null) {
        ;(ref as React.MutableRefObject<T | null>).current = value
      }
    })
  }
}
