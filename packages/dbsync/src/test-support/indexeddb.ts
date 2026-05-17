type RequestHandler<T> = (() => void) | undefined

type StoreData = {
	keyPath?: string
	values: Map<string, any>
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

/** Mimics the request object returned by IndexedDB operations. */
class FakeRequest<T = any> {
	/** The eventual request result. */
	public result!: T
	/** The request error, if one occurred. */
	public error: Error | null = null
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

	/** No-op index creation hook used by the shim. */
	createIndex() {
		return undefined
	}

	put(value: any, key?: string | number) {
		const request = new FakeRequest<any>()
		const recordKey = String(key ?? value.id)
		this.storeData.values.set(recordKey, clone(value))
		queueMicrotask(() => {
			request.result = clone(value)
			request.onsuccess?.()
		})
		return request
	}

	get(key: string | number) {
		const request = new FakeRequest<any>()
		const result = this.storeData.values.get(String(key))
		queueMicrotask(() => {
			request.result = result === undefined ? undefined : clone(result)
			request.onsuccess?.()
		})
		return request
	}

	getAll() {
		const request = new FakeRequest<any[]>()
		const result = [...this.storeData.values.values()].map(clone)
		queueMicrotask(() => {
			request.result = result
			request.onsuccess?.()
		})
		return request
	}

	delete(key: string | number) {
		const request = new FakeRequest<void>()
		this.storeData.values.delete(String(key))
		queueMicrotask(() => {
			request.result = undefined
			request.onsuccess?.()
		})
		return request
	}

	clear() {
		const request = new FakeRequest<void>()
		this.storeData.values.clear()
		queueMicrotask(() => {
			request.result = undefined
			request.onsuccess?.()
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
			this.stores.set(name, { keyPath: options?.keyPath, values: new Map() })
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
				request.onupgradeneeded?.({ target: request })
			} else if (isNewDatabase) {
				request.result = record.db
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
			request.onsuccess?.()
		})
		return request
	}
}

/**
 * Installs a small in-memory IndexedDB implementation for Vitest so the dbsync suites can run without a browser polyfill dependency.
 */
export const installIndexedDbTestShim = () => {
	;(globalThis as any).indexedDB = new FakeIndexedDB()
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
