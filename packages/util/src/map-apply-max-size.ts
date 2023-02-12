/**
 * Limit the size of a map by evicting the least-recently-used (aka LRU)
 * items. Works by monkey-patching the get and set of a map instance
 *
 * Warning: This hurts performance of map.get and map.set vs a normal map
 */
export function mapApplyMaxSize(map: any, maxSize: number) {
  map.max = maxSize
  map._set = map.set
  map._get = map.get
  map.set = (key: any, val: any) => {
    // if key exists, delete it so it can be re-added at end of map
    if (map.has(key)) {
      map.delete(key)
    } else {
      if (map.size >= map.max) {
        // evict top of map (aka oldest)
        map.delete(map.keys().next().value)
      }
    }

    // Now add key to end of map
    map._set(key, val)
    return val
  }
  map.get = (key: any) => {
    const item = map._get(key)
    if (item) {
      setTimeout(() => {
        // put key at end of map
        map.delete(key)
        map._set(key, item)
      })
    }
    return item
  }
}
// Test mapApplyMaxSize
// const assert = (b: boolean) => {
//   if (!b) throw new Error('assertion failed')
// }
// const t = new Map()
// t.setMaxSize(2)
// t.set('a', 1)
// t.set('b', 2)
// t.set('a', 1)
// t.set('c', 3) // should evict 'b'
// assert(t.get('b') === undefined)
// t.set('d', 4) // should evict 'a'
// assert(t.get('a') === undefined)
// t.get('c')
// t.set('e', 5) // should evict 'd'
// assert(t.get('d') === undefined)
// console.log('mapApplyMaxSize test passed')
