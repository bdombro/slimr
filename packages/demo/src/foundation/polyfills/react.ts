import * as r from "react"

declare global {
	var cloneElement: typeof r.cloneElement
	var createContext: typeof r.createContext
	var createElement: typeof r.createElement
	var createRef: typeof r.createRef

	var F: typeof r.Fragment
	var Fragment: typeof r.Fragment

	function memo<P extends object>(
		Component: r.FunctionComponent<P>,
		propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean,
	): r.NamedExoticComponent<P>
	function memo<T extends r.ComponentType<sany>>(
		Component: T,
		propsAreEqual?: (
			prevProps: Readonly<r.ComponentProps<T>>,
			nextProps: Readonly<r.ComponentProps<T>>,
		) => boolean,
	): r.MemoExoticComponent<T>

	var Suspense: typeof r.Suspense

	var useCallback: typeof r.useCallback
	var useContext: typeof r.useContext
	var useDebugValue: typeof r.useDebugValue
	var useDeferredValue: typeof r.useDeferredValue
	var useEffect: typeof r.useEffect
	var useId: typeof r.useId
	var useImperativeHandle: typeof r.useImperativeHandle
	var useInsertionEffect: typeof r.useInsertionEffect
	var useLayoutEffect: typeof r.useLayoutEffect
	var useMemo: typeof r.useMemo
	var useReducer: typeof r.useReducer
	var useRef: typeof r.useRef
	var useState: typeof r.useState
	var useSyncExternalStore: typeof r.useSyncExternalStore
	var useTransition: typeof r.useTransition
}

globalThis.cloneElement = r.cloneElement
globalThis.createContext = r.createContext
globalThis.createElement = r.createElement
globalThis.createRef = r.createRef
globalThis.F = r.Fragment
globalThis.Fragment = r.Fragment
globalThis.memo = r.memo
globalThis.Suspense = r.Suspense
globalThis.useCallback = r.useCallback
globalThis.useDebugValue = r.useDebugValue
globalThis.useDeferredValue = r.useDeferredValue
globalThis.useEffect = r.useEffect
globalThis.useId = r.useId
globalThis.useImperativeHandle = r.useImperativeHandle
globalThis.useInsertionEffect = r.useInsertionEffect
globalThis.useContext = r.useContext
globalThis.useLayoutEffect = r.useLayoutEffect
globalThis.useMemo = r.useMemo
globalThis.useReducer = r.useReducer
globalThis.useRef = r.useRef
globalThis.useState = r.useState
globalThis.useSyncExternalStore = r.useSyncExternalStore
globalThis.useTransition = r.useTransition
