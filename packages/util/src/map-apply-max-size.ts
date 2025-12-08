interface MapReturnType extends Map<any, any> {
	/** The max size of the map */
	max: number
	/** The raw map setter */
	_set: (key: any, val: any) => any
	/** The raw map getter */
	_get: (key: any) => any
}

/**
 * Apply a size limit to a map by evicting the least-recently-used (aka LRU)
 * items. Works by monkey-patching the get and set of a map instance
 *
 * Warning: This hurts performance of _map.get and _map.set vs a normal map
 *
 * @param map
 * the map to limit
 *
 * @param maxSize
 * the max size of the map
 *
 * @returns
 * the map with new types added. Note that the map is modified in-place, but
 * returned with added types for type-safety and convenience
 *
 * @example
 * ```typescript
 * const t = mapApplyMaxSize(new Map(), 2)
 * t.set('a', 1)
 * t.set('b', 2)
 * t.set('a', 1)
 * t.set('c', 3) // should evict 'b'
 * expect(t.get('b')).toBeUndefined()
 * t.set('d', 4) // should evict 'a'
 * expect(t.get('a')).toBeUndefined()
 * t.get('c')
 * t.set('e', 5) // should evict 'd'
 * expect(t.get('d')).toBeUndefined()
 * ```
 */
export function mapApplyMaxSize(
	/** The map to limit */
	map: Map<any, any>,
	/** The max size of the map */
	maxSize: number,
): MapReturnType {
	if ("_set" in map) return map as MapReturnType // seems like we've already applied max to this
	const _map = map as MapReturnType
	_map.max = maxSize
	_map._set = _map.set
	_map._get = _map.get
	_map.set = (key: any, val: any) => {
		// if key exists, delete it so it can be re-added at end of map
		if (_map.has(key)) {
			_map.delete(key)
		} else {
			if (_map.size >= _map.max) {
				// evict top of map (aka oldest)
				_map.delete(_map.keys().next().value)
			}
		}

		// Now add key to end of map
		_map._set(key, val)
		return val
	}
	_map.get = (key: any) => {
		const item = _map._get(key)
		if (item) {
			setTimeout(() => {
				// put key at end of map
				_map.delete(key)
				_map._set(key, item)
			})
		}
		return item
	}
	return _map
}
