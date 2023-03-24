import {useRef} from 'react'
import {useUpdate} from 'react-use'

export interface UseSet2<T> extends Set<T> {
  _add: Set<T>['add']
  _clear: Set<T>['clear']
  _delete: Set<T>['delete']
  toggle(v: T): void
  reset(): void
  _union(other: Set<T>): Set<T>
  union(other: Set<T>): Set<T>
}

/**
 * Returns a set-like object that intercepts the setter function to
 * trigger re-renders on change. Also adds a toggle and reset method.
 * 
 * @example
 * 
 * ```typescript
 * function MyComponent() {
 *   const optionalInitialValue = new Set()
 *   const set = useSet2(optionalInitialValue)

 *   // ... Use set like you would a vanilla JS Set
 * ```
 */
export function useSet2<T>(initial: Set<T> = new Set()) {
  const rerender = useUpdate()
  const setRef = useRef(initial as unknown as UseSet2<T>)
  const set = setRef.current

  if (!set._add) {
    set._add = set.add
    set.add = v => {
      set._add(v)
      rerender()
      return set
    }

    set._clear = set.clear
    set.clear = () => {
      set._clear()
      rerender()
      return set
    }

    set._delete = set.delete
    set.delete = v => {
      const res = set._delete(v)
      rerender()
      return res
    }

    set.reset = () => {
      set._clear()
      set._union(initial)
      rerender()
      return set
    }

    set.toggle = v => {
      if (set.has(v)) set._delete(v)
      else set._add(v)
      rerender()
      return set
    }

    set._union = (other: Set<T>) => {
      for (const elem of other) {
        set._add(elem)
      }
      return set
    }

    set.union = (other: Set<T>) => {
      set._union(other)
      rerender()
      return set
    }
  }

  return set
}
