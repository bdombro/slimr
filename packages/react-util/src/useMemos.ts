import { areNotEqualDeep } from "@slimr/util"
import { useEffect, useMemo, useState } from "react"

type Fnc = (...args: any[]) => any

/**
 * Like useMemo, but does a deep compare instead default compare
 * to avoid misfires. Is more expensive than useMemo though,
 * so use it intensionally.
 */
export function useDeepCompareMemo(callback: Fnc, varsToWatch: any[]) {
	const [lastSeenProps, setLastSeenProps] = useState(varsToWatch)
	useEffect(() => {
		if (areNotEqualDeep(varsToWatch, lastSeenProps)) {
			setLastSeenProps(varsToWatch)
		}
	}, varsToWatch)
	return useMemo(callback, [lastSeenProps])
}

/**
 * Like useMemo, but does a shallow compare instead default compare
 * to avoid misfires. Is more expensive than useMemo though, but
 * less than useDeepCompareMemo, so use it intentionally.
 */
export function useShallowCompareMemo(callback: Fnc, varsToWatch: any[]) {
	const [lastSeenProps, setLastSeenProps] = useState(varsToWatch)
	useEffect(() => {
		if (areNotEqualDeep(varsToWatch, lastSeenProps)) {
			setLastSeenProps(varsToWatch)
		}
	}, varsToWatch)
	return useMemo(callback, [lastSeenProps])
}
