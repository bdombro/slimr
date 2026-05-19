type RequestHandler = ((event?: any) => void) | undefined

type StoreData = {
	keyPath?: string
	values: Map<string, any>
	indexes: Set<string>
}

type DatabaseRecord = {
	version: number
	db: FakeDatabase
}

/** Stores the in-memory fake databases created by the test shim. */
const databases = new Map<string, DatabaseRecord>()

/** Clones values before storing or returning them from the fake IndexedDB. */
const clone = <T>(value: T): T => {
	if (typeof structuredClone === "function") return structuredClone(value)
	return JSON.parse(JSON.stringify(value))
}

/** Minimal key range helper used by the fake index implementation. */
class FakeKeyRange {
	constructor(
		public lower?: string | number,
		public upper?: string | number,
		public lowerOpen = false,
		public upperOpen = false,
	) {}

	/** Returns a range that matches one exact key. */
	static only(value: string | number) {
		return new FakeKeyRange(value, value, false, false)
	}

	/** Returns a range with only a lower bound. */
	static lowerBound(value: string | number, open = false) {
		return new FakeKeyRange(value, undefined, open, false)
	}

	/** Returns a range with only an upper bound. */
	static upperBound(value: string | number, open = false) {
		return new FakeKeyRange(undefined, value, false, open)
	}

	/** Returns a range bounded on both sides. */
	static bound(
		lower: string | number,
		upper: string | number,
		lowerOpen = false,
		upperOpen = false,
	) {
		return new FakeKeyRange(lower, upper, lowerOpen, upperOpen)
	}

	/** Checks whether a value falls within the fake range. */
	includes(value: string | number) {
		if (this.lower !== undefined) {
			if (this.lowerOpen ? value <= this.lower : value < this.lower) return false
		}
		if (this.upper !== undefined) {
			if (this.upperOpen ? value >= this.upper : value > this.upper) return false
		}
		return true
	}
}

/** Tracks a fake cursor over a precomputed result set. */
class FakeCursor<T> {
	private position = 0

	/** Creates a fake cursor that iterates a precomputed result set. */
	constructor(
		private values: T[],
		private request: FakeRequest<any>,
	) {
		this.publish()
	}

	/** Returns the current cursor value. */
	get value() {
		return this.values[this.position]
	}

	/** Advances the cursor to the next value. */
	continue() {
		this.position += 1
		this.publish()
	}

	/** Schedules the next cursor notification on the microtask queue. */
	private publish() {
		queueMicrotask(() => {
			this.request.result = this.position < this.values.length ? this : null
			this.request.onsuccess?.({ target: this.request })
		})
	}
}

/** Mimics an IndexedDB index backed by a store field. */
class FakeIndex {
	/** Creates a fake index over the requested store field. */
	constructor(
		private storeData: StoreData,
		private indexName: string,
	) {}

	/** Returns all matching records for the fake index. */
	getAll(range?: FakeKeyRange, count?: number) {
		const request = new FakeRequest<any[]>()
		const entries = [...this.storeData.values.values()]
			.filter((record) => {
				const candidate = record?.[this.indexName]
				return range ? range.includes(candidate) : true
			})
			.sort((left, right) => {
				const leftValue = left?.[this.indexName]
				const rightValue = right?.[this.indexName]
				if (leftValue < rightValue) return -1
				if (leftValue > rightValue) return 1
				return 0
			})
		const result = count === undefined ? entries : entries.slice(0, count)
		queueMicrotask(() => {
			request.result = result.map(clone)
			request.onsuccess?.({ target: request })
		})
		return request
	}

	/** Opens a cursor over matching records in index order. */
	openCursor(range?: FakeKeyRange, direction: IDBCursorDirection = "next") {
		const request = new FakeRequest<FakeCursor<any> | null>()
		const entries = [...this.storeData.values.values()]
			.filter((record) => {
				const candidate = record?.[this.indexName]
				return range ? range.includes(candidate) : true
			})
			.sort((left, right) => {
				const leftValue = left?.[this.indexName]
				const rightValue = right?.[this.indexName]
				if (leftValue < rightValue) return direction === "prev" ? 1 : -1
				if (leftValue > rightValue) return direction === "prev" ? -1 : 1
				return 0
			})
		queueMicrotask(() => {
			if (entries.length === 0) {
				request.result = null
				request.onsuccess?.({ target: request })
				return
			}
			request.result = new FakeCursor(entries, request)
		})
		return request
	}
}

/** Mimics the request object returned by IndexedDB operations. */
class FakeRequest<T = any> {
	/** The eventual request result. */
	public result!: T
	/** The request error, if one occurred. */
	public error: Error | null = null
	/** The versionchange transaction for upgrade requests, if one is active. */
	public transaction: FakeTransaction | null = null
	/** The success handler registered by consumer code. */
	public onsuccess: ((event: any) => void) | undefined = undefined
	/** The error handler registered by consumer code. */
	public onerror: ((event: any) => void) | undefined = undefined
	/** The upgrade handler registered by consumer code. */
	public onupgradeneeded: ((event: any) => void) | undefined = undefined
}

/** Mimics the DOMStringList used by IndexedDB for object store names. */
class FakeDOMStringList implements Iterable<string> {
	/** Creates a new list wrapper around the provided store names. */
	constructor(private names: string[]) {}

	/** Checks whether the provided name exists in the list. */
	contains(name: string) {
		return this.names.includes(name)
	}

	/** Returns the item at the requested index, or `null`. */
	item(index: number) {
		return this.names[index] ?? null
	}

	/** Returns the number of names contained in the list. */
	get length() {
		return this.names.length
	}

	/** Returns an iterator over the underlying names. */
	[Symbol.iterator]() {
		return this.names[Symbol.iterator]()
	}
}

/** Mimics an IndexedDB object store backed by an in-memory map. */
class FakeObjectStore {
	/** Creates a fake object store from the provided data bucket. */
	constructor(private storeData: StoreData) {}

	/** The declared fake index names for the store. */
	get indexNames() {
		return new FakeDOMStringList([...this.storeData.indexes])
	}

	/** No-op index creation hook used by the shim. */
	createIndex(name: string) {
		this.storeData.indexes.add(name)
		return undefined
	}

	/** Returns a fake index for the requested field. */
	index(name: string) {
		if (!this.storeData.indexes.has(name)) {
			throw new Error(`Index ${name} does not exist`)
		}
		return new FakeIndex(this.storeData, name)
	}

	/** Stores a cloned record under the resolved key. */
	put(value: any, key?: string | number) {
		const request = new FakeRequest<any>()
		const recordKey = String(key ?? value.id)
		this.storeData.values.set(recordKey, clone(value))
		queueMicrotask(() => {
			request.result = clone(value)
			request.onsuccess?.({ target: request })
		})
		return request
	}

	/** Reads a single record by primary key. */
	get(key: string | number) {
		const request = new FakeRequest<any>()
		const result = this.storeData.values.get(String(key))
		queueMicrotask(() => {
			request.result = result === undefined ? undefined : clone(result)
			request.onsuccess?.({ target: request })
		})
		return request
	}

	/** Returns every record stored in insertion order. */
	getAll() {
		const request = new FakeRequest<any[]>()
		const result = [...this.storeData.values.values()].map(clone)
		queueMicrotask(() => {
			request.result = result
			request.onsuccess?.({ target: request })
		})
		return request
	}

	/** Opens a cursor over the primary key order for the store. */
	openCursor(range?: FakeKeyRange, direction: IDBCursorDirection = "next") {
		return new FakeIndex(this.storeData, this.storeData.keyPath ?? "id").openCursor(
			range,
			direction,
		)
	}

	/** Deletes a record by primary key. */
	delete(key: string | number) {
		const request = new FakeRequest<void>()
		this.storeData.values.delete(String(key))
		queueMicrotask(() => {
			request.result = undefined
			request.onsuccess?.({ target: request })
		})
		return request
	}

	/** Clears every record from the store. */
	clear() {
		const request = new FakeRequest<void>()
		this.storeData.values.clear()
		queueMicrotask(() => {
			request.result = undefined
			request.onsuccess?.({ target: request })
		})
		return request
	}
}

/** Mimics an IndexedDB transaction over one or more fake stores. */
class FakeTransaction {
	/** Fires when the transaction finishes successfully. */
	public oncomplete: RequestHandler = undefined
	/** Fires when the transaction fails. */
	public onerror: RequestHandler = undefined

	/** Creates a fake transaction and schedules its completion. */
	constructor(
		private db: FakeDatabase,
		_storeNames: string[],
	) {
		queueMicrotask(() => {
			this.oncomplete?.()
		})
	}

	/** Returns the requested fake object store. */
	objectStore(name: string) {
		const store = this.db.stores.get(name)
		if (!store) throw new Error(`Object store ${name} does not exist`)
		return new FakeObjectStore(store)
	}
}

/** Mimics the IndexedDB database object used in tests. */
class FakeDatabase {
	/** The object store names available on the fake database. */
	public objectStoreNames: FakeDOMStringList
	/** The current fake database version. */
	public version: number

	/** Creates a fake database with the given stores. */
	constructor(
		public name: string,
		version: number,
		public stores: Map<string, StoreData>,
	) {
		this.version = version
		this.objectStoreNames = new FakeDOMStringList([...stores.keys()])
	}

	/** Creates a fake object store if it does not already exist. */
	createObjectStore(name: string, options?: { keyPath?: string }) {
		if (!this.stores.has(name)) {
			this.stores.set(name, { keyPath: options?.keyPath, values: new Map(), indexes: new Set() })
			this.objectStoreNames = new FakeDOMStringList([...this.stores.keys()])
		}
		return new FakeObjectStore(this.stores.get(name)!)
	}

	/** Returns a fake transaction wrapper for the requested stores. */
	transaction(storeNames: string | string[], _mode: IDBTransactionMode) {
		const names = Array.isArray(storeNames) ? storeNames : [storeNames]
		return new FakeTransaction(this, names)
	}

	/** Closes the fake database. */
	close() {
		return undefined
	}
}

/** Mimics the global IndexedDB factory used by the test shim. */
class FakeIndexedDB {
	/** Opens a fake database, creating it or upgrading it as needed. */
	open(name: string, version = 1) {
		const request = new FakeRequest<FakeDatabase>()
		queueMicrotask(() => {
			let record = databases.get(name)
			const isNewDatabase = !record
			if (!record) {
				record = { version, db: new FakeDatabase(name, version, new Map()) }
				databases.set(name, record)
			}

			if (version > record.version) {
				record.version = version
				record.db.version = version
				request.result = record.db
				request.transaction = record.db.transaction([...record.db.stores.keys()], "versionchange")
				request.onupgradeneeded?.({ target: request })
			} else if (isNewDatabase) {
				request.result = record.db
				request.transaction = record.db.transaction([...record.db.stores.keys()], "versionchange")
				request.onupgradeneeded?.({ target: request })
			}

			request.result = record.db
			request.onsuccess?.({ target: request })
		})
		return request
	}

	/** Deletes a fake database from the in-memory registry. */
	deleteDatabase(name: string) {
		const request = new FakeRequest<void>()
		queueMicrotask(() => {
			databases.delete(name)
			request.result = undefined
			request.onsuccess?.({ target: request })
		})
		return request
	}
}

/**
 * Installs a small in-memory IndexedDB implementation for Vitest so the dbsync suites can run without a browser polyfill dependency.
 */
export const installIndexedDbTestShim = () => {
	;(globalThis as any).indexedDB = new FakeIndexedDB()
	;(globalThis as any).IDBKeyRange = {
		only: FakeKeyRange.only,
		lowerBound: FakeKeyRange.lowerBound,
		upperBound: FakeKeyRange.upperBound,
		bound: FakeKeyRange.bound,
	}
	const storage = new Map<string, string>()
	;(globalThis as any).localStorage = {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => {
			storage.set(key, String(value))
		},
		removeItem: (key: string) => {
			storage.delete(key)
		},
		clear: () => {
			storage.clear()
		},
	}
}
