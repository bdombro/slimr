type RequestHandler<T> = (() => void) | undefined

type StoreData = {
	keyPath?: string
	values: Map<string, any>
}

type DatabaseRecord = {
	version: number
	db: FakeDatabase
}

const databases = new Map<string, DatabaseRecord>()

const clone = <T>(value: T): T => {
	if (typeof structuredClone === "function") return structuredClone(value)
	return JSON.parse(JSON.stringify(value))
}

class FakeRequest<T = any> {
	public result!: T
	public error: Error | null = null
	public onsuccess: ((event: any) => void) | undefined = undefined
	public onerror: ((event: any) => void) | undefined = undefined
	public onupgradeneeded: ((event: any) => void) | undefined = undefined
}

class FakeDOMStringList implements Iterable<string> {
	constructor(private names: string[]) {}

	contains(name: string) {
		return this.names.includes(name)
	}

	item(index: number) {
		return this.names[index] ?? null
	}

	get length() {
		return this.names.length
	}

	[Symbol.iterator]() {
		return this.names[Symbol.iterator]()
	}
}

class FakeObjectStore {
	constructor(private storeData: StoreData) {}

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

class FakeTransaction {
	public oncomplete: RequestHandler = undefined
	public onerror: RequestHandler = undefined

	constructor(
		private db: FakeDatabase,
		_storeNames: string[],
	) {
		queueMicrotask(() => {
			this.oncomplete?.()
		})
	}

	objectStore(name: string) {
		const store = this.db.stores.get(name)
		if (!store) throw new Error(`Object store ${name} does not exist`)
		return new FakeObjectStore(store)
	}
}

class FakeDatabase {
	public objectStoreNames: FakeDOMStringList
	public version: number

	constructor(
		public name: string,
		version: number,
		public stores: Map<string, StoreData>,
	) {
		this.version = version
		this.objectStoreNames = new FakeDOMStringList([...stores.keys()])
	}

	createObjectStore(name: string, options?: { keyPath?: string }) {
		if (!this.stores.has(name)) {
			this.stores.set(name, { keyPath: options?.keyPath, values: new Map() })
			this.objectStoreNames = new FakeDOMStringList([...this.stores.keys()])
		}
		return new FakeObjectStore(this.stores.get(name)!)
	}

	transaction(storeNames: string | string[], _mode: IDBTransactionMode) {
		const names = Array.isArray(storeNames) ? storeNames : [storeNames]
		return new FakeTransaction(this, names)
	}

	close() {
		return undefined
	}
}

class FakeIndexedDB {
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

/** Installs a small in-memory IndexedDB implementation for Vitest so the dbsync suites can run without a browser polyfill dependency. */
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
