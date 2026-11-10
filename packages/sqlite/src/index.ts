import { Worker } from "node:worker_threads"

export type SQLInputValue = null | number | bigint | string | Uint8Array

export type SqliteParams = SQLInputValue[] | Record<string, SQLInputValue>

export interface RunResult {
	changes: number | bigint
	lastInsertRowid: number | bigint
}

export type SqliteFunctionHandler = (...args: SQLInputValue[]) => SQLInputValue

export interface SqliteFunctionDef {
	fn: SqliteFunctionHandler | string
	deterministic?: boolean
	varargs?: boolean
	directOnly?: boolean
	useBigIntArguments?: boolean
}

export interface SerializedFunctionDef {
	fnSource: string
	deterministic: boolean
	varargs: boolean
	directOnly: boolean
	useBigIntArguments: boolean
}

export type TransactionMode = "IMMEDIATE" | "DEFERRED" | "EXCLUSIVE"

export interface TransactionOptions {
	mode?: TransactionMode
}

export interface BatchItem {
	sql: string
	params?: SqliteParams
	mode?: "all" | "get" | "run" | "exec" | "pluck" | "pluckAll"
	readBigInts?: boolean
}

export interface SqliteOptions {
	readOnly?: boolean
	readBigInts?: boolean
	pragmas?: string | false
	migrations?: Record<number, string> | readonly string[]
	init?: (tx: SqliteTx) => Promise<void> | void
	dedicated?: boolean
	idleTimeoutMs?: number
	functions?: Record<string, SqliteFunctionDef | SqliteFunctionHandler>
}

export interface IterateOptions {
	limit?: number
	readBigInts?: boolean
	readOnlyConnection?: boolean
	setupSql?: string
}

export interface QueryOptions {
	readBigInts?: boolean
}

export interface BatchOptions {
	atomic?: boolean
}

export interface SqliteQueryable {
	get<T = Record<string, unknown>>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T | undefined>
	all<T = Record<string, unknown>>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T[]>
	run(sql: string, params?: SqliteParams, options?: QueryOptions): Promise<RunResult>
	pluck<T = SQLInputValue>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T | undefined>
	pluckAll<T = SQLInputValue>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T[]>
	exec(sql: string): Promise<void>
	batch(items: BatchItem[], options?: BatchOptions): Promise<unknown[]>
	transaction<T>(fn: (tx: SqliteTx) => Promise<T> | T, options?: TransactionOptions): Promise<T>
}

function serializeFunction(
	entry: SqliteFunctionDef | SqliteFunctionHandler,
): SerializedFunctionDef {
	if (typeof entry === "function") {
		return {
			fnSource: entry.toString(),
			deterministic: true,
			varargs: false,
			directOnly: false,
			useBigIntArguments: false,
		}
	}
	return {
		fnSource: typeof entry.fn === "function" ? entry.fn.toString() : entry.fn,
		deterministic: entry.deterministic ?? true,
		varargs: Boolean(entry.varargs),
		directOnly: Boolean(entry.directOnly),
		useBigIntArguments: Boolean(entry.useBigIntArguments),
	}
}

const SUPPRESS_SQLITE_WARNING_SYMBOL = Symbol.for("@slimr/sqlite.warning_filter")

function suppressSqliteWarning(): void {
	if (typeof process === "undefined" || !process.emitWarning) {
		return
	}
	const proc = process as unknown as Record<symbol, boolean> & {
		emitWarning: (warning: unknown, ...args: unknown[]) => void
	}
	if (proc[SUPPRESS_SQLITE_WARNING_SYMBOL]) {
		return
	}
	proc[SUPPRESS_SQLITE_WARNING_SYMBOL] = true

	const originalEmitWarning = proc.emitWarning.bind(process)
	proc.emitWarning = (warning: unknown, ...args: unknown[]) => {
		if (typeof warning === "string") {
			if (/SQLite/i.test(warning)) {
				return
			}
		} else if (warning && typeof (warning as { message?: unknown }).message === "string") {
			if (/SQLite/i.test((warning as { message: string }).message)) {
				return
			}
		}
		originalEmitWarning(warning, ...args)
	}
}

suppressSqliteWarning()

const WORKER_CODE = `
const SUPPRESS_SYMBOL = Symbol.for("@slimr/sqlite.warning_filter");
if (typeof process !== "undefined" && process.emitWarning && !process[SUPPRESS_SYMBOL]) {
	process[SUPPRESS_SYMBOL] = true;
	const origEmit = process.emitWarning.bind(process);
	process.emitWarning = function(w, ...a) {
		if (typeof w === "string" && /SQLite/i.test(w)) return;
		if (w && typeof w.message === "string" && /SQLite/i.test(w.message)) return;
		return origEmit(w, ...a);
	};
}

const getBuiltin = typeof process !== "undefined" && process.getBuiltinModule
	? (id) => process.getBuiltinModule(id)
	: (id) => require(id);
const { parentPort } = getBuiltin("node:worker_threads");
const { mkdirSync } = getBuiltin("node:fs");
const { dirname } = getBuiltin("node:path");
const sqlite = getBuiltin("node:sqlite");

const dbs = new Map();

function isNamedParams(params) {
	return Boolean(
		params &&
			typeof params === "object" &&
			!Array.isArray(params) &&
			!(params instanceof Uint8Array)
	);
}

function execStmt(stmt, method, params) {
	if (isNamedParams(params)) {
		return stmt[method](params);
	}
	return stmt[method](...(params || []));
}

function registerFunctionsOnDb(targetDb, serializedFunctions) {
	if (!targetDb || !serializedFunctions || typeof serializedFunctions !== "object") {
		return;
	}
	for (const [name, def] of Object.entries(serializedFunctions)) {
		if (!def || !def.fnSource) continue;
		const fn = (0, eval)("(" + def.fnSource + ")");
		targetDb.function(
			name,
			{
				deterministic: Boolean(def.deterministic),
				varargs: Boolean(def.varargs),
				directOnly: Boolean(def.directOnly),
				useBigIntArguments: Boolean(def.useBigIntArguments),
			},
			fn
		);
	}
}

function ensureOpen(entry) {
	if (!entry.db) {
		if (entry.path !== ":memory:" && !entry.options.readOnly) {
			mkdirSync(dirname(entry.path), { recursive: true });
		}
		entry.db = entry.options.readOnly
			? new sqlite.DatabaseSync(entry.path, { readOnly: true })
			: new sqlite.DatabaseSync(entry.path);

		if (!entry.options.readOnly) {
			if (entry.options.pragmas !== false) {
				entry.db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA temp_store = MEMORY;");
				if (entry.path !== ":memory:") {
					try {
						entry.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
					} catch (_) {}
				}
				if (typeof entry.options.pragmas === "string") {
					entry.db.exec(entry.options.pragmas);
				}
			}
			if (!entry.migrated && entry.options.migrations) {
				const raw = entry.options.migrations;
				const steps = Array.isArray(raw)
					? raw.map((sql, idx) => [idx + 1, sql])
					: Object.entries(raw)
							.map(([k, sql]) => [Number(k), sql])
							.filter(([v]) => Number.isInteger(v) && v > 0)
							.sort((a, b) => a[0] - b[0]);
				if (steps.length > 0) {
					const row = entry.db.prepare("PRAGMA user_version").get();
					const currentVersion = Number(row ? row.user_version : 0);
					const minVersion = steps[0][0];
					if (currentVersion > 0 && currentVersion < minVersion) {
						throw new Error(
							"Database user_version (" +
								currentVersion +
								") is older than minimum migration version (" +
								minVersion +
								")"
						);
					}
					const pending = steps.filter(([v]) => v > currentVersion);
					if (pending.length > 0) {
						entry.db.exec("BEGIN IMMEDIATE");
						try {
							for (const [v, sql] of pending) {
								entry.db.exec(sql);
								entry.db.exec("PRAGMA user_version = " + v);
							}
							entry.db.exec("COMMIT");
						} catch (err) {
							try {
								entry.db.exec("ROLLBACK");
							} catch (_) {}
							throw err;
						}
					}
				}
				entry.migrated = true;
			}
		} else if (typeof entry.options.pragmas === "string") {
			entry.db.exec(entry.options.pragmas);
		}

		if (entry.options && entry.options.functions) {
			registerFunctionsOnDb(entry.db, entry.options.functions);
		}
	}
}

function prepareStmt(entry, sql, readBigInts, allowBareNamed) {
	const effectiveBigInts = readBigInts !== undefined
		? Boolean(readBigInts)
		: Boolean(entry.options && entry.options.readBigInts);
	const bareFlag = Boolean(allowBareNamed);
	const key = (effectiveBigInts ? "1:" : "0:") + (bareFlag ? "N:" : "P:") + sql;
	let stmt = entry.stmts.get(key);
	if (!stmt) {
		stmt = entry.db.prepare(sql);
		if (effectiveBigInts) {
			stmt.setReadBigInts(true);
		}
		if (bareFlag && typeof stmt.setAllowBareNamedParameters === "function") {
			stmt.setAllowBareNamedParameters(true);
		}
		entry.stmts.set(key, stmt);
	}
	return stmt;
}

function clearStmts(entry) {
	for (const stmt of entry.stmts.values()) {
		try { stmt.close(); } catch (_) {}
	}
	entry.stmts.clear();
}

async function handleAction(action, entry, payload, dbId) {
	switch (action) {
		case "open": {
			let current = dbs.get(dbId);
			if (!current) {
				current = {
					db: null,
					path: payload.path,
					options: payload.options || {},
					stmts: new Map(),
					migrated: Boolean(payload.options && payload.options.migrated),
					txDepth: 0,
				};
				dbs.set(dbId, current);
			} else {
				current.path = payload.path;
				current.options = payload.options || {};
				if (payload.options && payload.options.migrated) {
					current.migrated = true;
				}
			}
			ensureOpen(current);
			return;
		}
		case "registerFunction": {
			ensureOpen(entry);
			if (!entry.options) {
				entry.options = {};
			}
			if (!entry.options.functions) {
				entry.options.functions = {};
			}
			entry.options.functions[payload.name] = payload.def;
			registerFunctionsOnDb(entry.db, { [payload.name]: payload.def });
			clearStmts(entry);
			return;
		}
		case "get": {
			ensureOpen(entry);
			const named = isNamedParams(payload.params);
			const s = prepareStmt(entry, payload.sql, payload.readBigInts, named);
			const row = execStmt(s, "get", payload.params);
			return row ? { ...row } : undefined;
		}
		case "all": {
			ensureOpen(entry);
			const named = isNamedParams(payload.params);
			const s = prepareStmt(entry, payload.sql, payload.readBigInts, named);
			const rows = execStmt(s, "all", payload.params);
			return rows.map((r) => ({ ...r }));
		}
		case "run": {
			ensureOpen(entry);
			const named = isNamedParams(payload.params);
			const s = prepareStmt(entry, payload.sql, payload.readBigInts, named);
			const r = execStmt(s, "run", payload.params);
			return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
		}
		case "pluck": {
			ensureOpen(entry);
			const named = isNamedParams(payload.params);
			const s = prepareStmt(entry, payload.sql, payload.readBigInts, named);
			const row = execStmt(s, "get", payload.params);
			if (!row) {
				return undefined;
			}
			const keys = Object.keys(row);
			return keys.length > 0 ? row[keys[0]] : undefined;
		}
		case "pluckAll": {
			ensureOpen(entry);
			const named = isNamedParams(payload.params);
			const s = prepareStmt(entry, payload.sql, payload.readBigInts, named);
			const rows = execStmt(s, "all", payload.params);
			if (!rows || rows.length === 0) {
				return [];
			}
			const k = Object.keys(rows[0])[0];
			return rows.map((r) => r[k]);
		}
		case "exec": {
			ensureOpen(entry);
			clearStmts(entry);
			entry.db.exec(payload.sql);
			return;
		}
		case "batch": {
			ensureOpen(entry);
			const { items, atomic } = payload;
			const wrapAtomic = Boolean(atomic && entry.txDepth === 0);
			if (wrapAtomic) {
				entry.db.exec("BEGIN IMMEDIATE");
			}
			const results = [];
			try {
				for (const item of items) {
					const mode = item.mode || "run";
					const named = isNamedParams(item.params);
					if (mode === "run") {
						const s = prepareStmt(entry, item.sql, item.readBigInts, named);
						const r = execStmt(s, "run", item.params);
						results.push({ changes: r.changes, lastInsertRowid: r.lastInsertRowid });
					} else if (mode === "get") {
						const s = prepareStmt(entry, item.sql, item.readBigInts, named);
						const r = execStmt(s, "get", item.params);
						results.push(r ? { ...r } : undefined);
					} else if (mode === "all") {
						const s = prepareStmt(entry, item.sql, item.readBigInts, named);
						const r = execStmt(s, "all", item.params);
						results.push(r.map((x) => ({ ...x })));
					} else if (mode === "pluck") {
						const s = prepareStmt(entry, item.sql, item.readBigInts, named);
						const r = execStmt(s, "get", item.params);
						if (!r) {
							results.push(undefined);
						} else {
							const keys = Object.keys(r);
							results.push(keys.length > 0 ? r[keys[0]] : undefined);
						}
					} else if (mode === "pluckAll") {
						const s = prepareStmt(entry, item.sql, item.readBigInts, named);
						const r = execStmt(s, "all", item.params);
						if (!r || r.length === 0) {
							results.push([]);
						} else {
							const k = Object.keys(r[0])[0];
							results.push(r.map((row) => row[k]));
						}
					} else if (mode === "exec") {
						clearStmts(entry);
						entry.db.exec(item.sql);
						results.push(undefined);
					} else {
						throw new Error("Unknown batch item mode: " + mode);
					}
				}
				if (wrapAtomic) {
					entry.db.exec("COMMIT");
				}
				return results;
			} catch (err) {
				if (wrapAtomic) {
					try {
						entry.db.exec("ROLLBACK");
					} catch (_) {}
				}
				throw err;
			}
		}
		case "iterateLimited": {
			ensureOpen(entry);
			const { sql, params, limit, readBigInts, readOnlyConnection, setupSql } = payload;
			let targetDb = entry.db;
			let tempDb = null;
			if (readOnlyConnection && entry.path !== ":memory:") {
				tempDb = new sqlite.DatabaseSync(entry.path, { readOnly: true });
				tempDb.exec("PRAGMA busy_timeout = 5000;");
				registerFunctionsOnDb(tempDb, entry.options && entry.options.functions);
				if (typeof setupSql === "string" && setupSql.trim().length > 0) {
					tempDb.exec(setupSql);
					tempDb.exec("PRAGMA query_only = ON;");
				}
				targetDb = tempDb;
			} else if (typeof setupSql === "string" && setupSql.trim().length > 0) {
				targetDb.exec(setupSql);
			}

			let stmt = null;
			try {
				stmt = targetDb.prepare(sql);
				const effectiveBigInts = readBigInts !== undefined
					? Boolean(readBigInts)
					: Boolean(entry.options && entry.options.readBigInts);
				if (effectiveBigInts) {
					stmt.setReadBigInts(true);
				}
				const named = isNamedParams(params);
				if (named && typeof stmt.setAllowBareNamedParameters === "function") {
					stmt.setAllowBareNamedParameters(true);
				}
				const maxLimit = typeof limit === "number" ? limit : Number.POSITIVE_INFINITY;
				const rows = [];
				let truncated = false;
				const iterator = named ? stmt.iterate(params) : stmt.iterate(...(params || []));
				for (const row of iterator) {
					if (rows.length < maxLimit) {
						rows.push({ ...row });
					} else {
						truncated = true;
						break;
					}
				}
				const columns = typeof stmt.columns === "function"
					? stmt.columns().map((c) => c.name)
					: (rows[0] ? Object.keys(rows[0]) : []);
				return { columns, rows, truncated };
			} finally {
				if (stmt && typeof stmt.close === "function") {
					try { stmt.close(); } catch (_) {}
				}
				if (tempDb) {
					try { tempDb.close(); } catch (_) {}
				}
			}
		}
		case "backup": {
			ensureOpen(entry);
			clearStmts(entry);
			await sqlite.backup(entry.db, payload.destPath);
			return;
		}
		case "close": {
			if (entry) {
				clearStmts(entry);
				if (entry.db) {
					try {
						entry.db.close();
					} catch (_) {}
					entry.db = null;
				}
				dbs.delete(dbId);
			}
			return;
		}
		case "txBegin": {
			ensureOpen(entry);
			const mode = payload.mode || "IMMEDIATE";
			entry.db.exec("BEGIN " + mode);
			entry.txDepth = 1;
			return;
		}
		case "txCommit": {
			ensureOpen(entry);
			entry.db.exec("COMMIT");
			entry.txDepth = 0;
			return;
		}
		case "txRollback": {
			ensureOpen(entry);
			try {
				entry.db.exec("ROLLBACK");
			} finally {
				entry.txDepth = 0;
			}
			return;
		}
		case "txSavepoint": {
			ensureOpen(entry);
			entry.txDepth = payload.depth;
			entry.db.exec("SAVEPOINT sp_" + payload.depth);
			return;
		}
		case "txRelease": {
			ensureOpen(entry);
			entry.db.exec("RELEASE SAVEPOINT sp_" + payload.depth);
			entry.txDepth = payload.depth - 1;
			return;
		}
		case "txRollbackTo": {
			ensureOpen(entry);
			try {
				entry.db.exec("ROLLBACK TO SAVEPOINT sp_" + payload.depth);
			} finally {
				entry.txDepth = payload.depth - 1;
			}
			return;
		}
		default:
			throw new Error("Unknown worker action: " + action);
	}
}

parentPort.on("message", async (msg) => {
	const { id, dbId, action, ...payload } = msg;
	try {
		const entry = dbs.get(dbId);
		if (!entry && action !== "open") {
			throw new Error("Database not found on worker for dbId: " + dbId);
		}
		const result = await handleAction(action, entry, payload, dbId);
		parentPort.postMessage({ id, ok: true, result });
	} catch (err) {
		parentPort.postMessage({
			id,
			ok: false,
			error: {
				message: err && err.message ? err.message : String(err),
				code: err && err.code ? err.code : undefined,
				name: err && err.name ? err.name : "Error",
				stack: err && err.stack ? err.stack : undefined,
			},
		});
	}
});
`

interface PendingRequest {
	resolve: (val: unknown) => void
	reject: (err: unknown) => void
}

interface RegisteredDb {
	path: string
	options: SqliteOptions
	serializedFunctions: Record<string, SerializedFunctionDef>
	migrated: boolean
	isOpenedInWorker: boolean
}

let nextDbSequence = 1

export class WorkerManager {
	idleTimeoutMs: number
	private readonly dedicated: boolean
	private worker: Worker | null = null
	private readonly pendingRequests = new Map<number, PendingRequest>()
	private nextReqId = 1
	private readonly registeredDbs = new Map<string, RegisteredDb>()
	private activeTxCount = 0
	private idleTimer: ReturnType<typeof setTimeout> | null = null
	private readonly openDbPromises = new Map<string, Promise<void>>()
	private workerSpawnPromise: Promise<Worker> | null = null

	constructor(idleTimeoutMs = 30_000, dedicated = false) {
		this.idleTimeoutMs = idleTimeoutMs
		this.dedicated = dedicated
	}

	registerDb(dbId: string, path: string, options: SqliteOptions): void {
		const serializedFunctions: Record<string, SerializedFunctionDef> = {}
		if (options.functions) {
			for (const [name, def] of Object.entries(options.functions)) {
				serializedFunctions[name] = serializeFunction(def)
			}
		}
		this.registeredDbs.set(dbId, {
			path,
			options,
			serializedFunctions,
			migrated: false,
			isOpenedInWorker: false,
		})
	}

	registerFunction(dbId: string, name: string, def: SerializedFunctionDef): void {
		const entry = this.registeredDbs.get(dbId)
		if (entry) {
			entry.serializedFunctions[name] = def
		}
	}

	private async getWorker(): Promise<Worker> {
		if (this.worker) {
			return this.worker
		}
		if (!this.workerSpawnPromise) {
			this.workerSpawnPromise = (async () => {
				const worker = new Worker(WORKER_CODE, { eval: true })
				worker.unref()

				worker.on(
					"message",
					(msg: {
						id: number
						ok: boolean
						result?: unknown
						error?: { message: string; code?: string; name?: string; stack?: string }
					}) => {
						const pending = this.pendingRequests.get(msg.id)
						if (!pending) {
							return
						}
						this.pendingRequests.delete(msg.id)
						if (this.pendingRequests.size === 0) {
							this.worker?.unref()
							this.checkIdle()
						}
						if (msg.ok) {
							pending.resolve(msg.result)
						} else {
							const err = new Error(msg.error?.message || "Unknown worker error")
							if (msg.error?.code) {
								;(err as unknown as { code: string }).code = msg.error.code
							}
							if (msg.error?.name) {
								err.name = msg.error.name
							}
							if (msg.error?.stack) {
								err.stack = msg.error.stack
							}
							pending.reject(err)
						}
					},
				)

				worker.on("error", (err: Error) => {
					this.handleWorkerDeath(err)
				})

				worker.on("exit", (code: number) => {
					this.handleWorkerDeath(new Error(`SQLite worker exited with code ${code}`))
				})

				this.worker = worker
				for (const entry of this.registeredDbs.values()) {
					entry.isOpenedInWorker = false
				}
				return worker
			})().finally(() => {
				this.workerSpawnPromise = null
			})
		}
		return await this.workerSpawnPromise
	}

	private handleWorkerDeath(err: Error): void {
		this.worker = null
		if (this.idleTimer) {
			clearTimeout(this.idleTimer)
			this.idleTimer = null
		}
		for (const entry of this.registeredDbs.values()) {
			entry.isOpenedInWorker = false
		}
		for (const [id, pending] of this.pendingRequests.entries()) {
			this.pendingRequests.delete(id)
			pending.reject(err)
		}
	}

	private async sendRaw<T>(
		dbId: string,
		action: string,
		payload: Record<string, unknown> = {},
	): Promise<T> {
		const worker = await this.getWorker()
		if (this.idleTimer) {
			clearTimeout(this.idleTimer)
			this.idleTimer = null
		}
		const reqId = this.nextReqId++
		return await new Promise<T>((resolve, reject) => {
			this.pendingRequests.set(reqId, { resolve: resolve as (val: unknown) => void, reject })
			if (this.pendingRequests.size === 1) {
				worker.ref()
			}
			worker.postMessage({ id: reqId, dbId, action, ...payload })
		})
	}

	async ensureDbOpen(dbId: string): Promise<void> {
		const entry = this.registeredDbs.get(dbId)
		if (!entry) {
			throw new Error(`Database ${dbId} is not registered`)
		}
		if (entry.isOpenedInWorker && this.worker) {
			return
		}
		let openPromise = this.openDbPromises.get(dbId)
		if (!openPromise) {
			openPromise = (async () => {
				await this.getWorker()
				const { init: _init, functions: _functions, ...workerOptions } = entry.options
				await this.sendRaw(dbId, "open", {
					path: entry.path,
					options: {
						...workerOptions,
						functions: entry.serializedFunctions,
						migrated: entry.migrated,
					},
				})
				entry.isOpenedInWorker = true
				entry.migrated = true
			})().finally(() => {
				this.openDbPromises.delete(dbId)
			})
			this.openDbPromises.set(dbId, openPromise)
		}
		await openPromise
	}

	async sendAction<T>(
		dbId: string,
		action: string,
		payload: Record<string, unknown> = {},
	): Promise<T> {
		await this.ensureDbOpen(dbId)
		return await this.sendRaw<T>(dbId, action, payload)
	}

	incrementTx(): void {
		this.activeTxCount++
		if (this.idleTimer) {
			clearTimeout(this.idleTimer)
			this.idleTimer = null
		}
	}

	decrementTx(): void {
		this.activeTxCount = Math.max(0, this.activeTxCount - 1)
		this.checkIdle()
	}

	private hasMemoryDb(): boolean {
		for (const entry of this.registeredDbs.values()) {
			if (entry.path === ":memory:") {
				return true
			}
		}
		return false
	}

	checkIdle(): void {
		if (this.pendingRequests.size > 0 || this.activeTxCount > 0 || this.hasMemoryDb()) {
			return
		}
		if (this.idleTimer) {
			clearTimeout(this.idleTimer)
		}
		this.idleTimer = setTimeout(() => {
			void this.onIdleTimeout()
		}, this.idleTimeoutMs)
		if (this.idleTimer && typeof this.idleTimer.unref === "function") {
			this.idleTimer.unref()
		}
	}

	private async onIdleTimeout(): Promise<void> {
		this.idleTimer = null
		if (this.pendingRequests.size > 0 || this.activeTxCount > 0 || this.hasMemoryDb()) {
			return
		}
		const currentWorker = this.worker
		this.worker = null
		for (const entry of this.registeredDbs.values()) {
			entry.isOpenedInWorker = false
			entry.migrated = true
		}
		if (currentWorker) {
			try {
				await currentWorker.terminate()
			} catch (_) {}
		}
	}

	async closeDb(dbId: string): Promise<void> {
		const entry = this.registeredDbs.get(dbId)
		if (!entry) {
			return
		}
		try {
			if (this.worker && entry.isOpenedInWorker) {
				await this.sendRaw(dbId, "close")
			}
		} catch (_) {
		} finally {
			this.registeredDbs.delete(dbId)
			if (this.dedicated || this.registeredDbs.size === 0) {
				if (this.idleTimer) {
					clearTimeout(this.idleTimer)
					this.idleTimer = null
				}
				const currentWorker = this.worker
				this.worker = null
				if (currentWorker) {
					try {
						await currentWorker.terminate()
					} catch (_) {}
				}
			} else {
				this.checkIdle()
			}
		}
	}

	/** Exposed for tests to inspect worker state */
	get isWorkerAlive(): boolean {
		return this.worker !== null
	}
}

const SHARED_MANAGER_SYMBOL = Symbol.for("@slimr/sqlite.manager.v1")

function getSharedManager(idleTimeoutMs?: number): WorkerManager {
	const globalObj = globalThis as unknown as Record<symbol, WorkerManager | undefined>
	let mgr = globalObj[SHARED_MANAGER_SYMBOL]
	if (!mgr) {
		mgr = new WorkerManager(idleTimeoutMs ?? 30_000, false)
		globalObj[SHARED_MANAGER_SYMBOL] = mgr
	} else if (idleTimeoutMs !== undefined && idleTimeoutMs < mgr.idleTimeoutMs) {
		mgr.idleTimeoutMs = idleTimeoutMs
	}
	return mgr
}

export class SqliteTx implements SqliteQueryable {
	constructor(
		private readonly db: SqliteDb,
		readonly depth: number,
	) {}

	async get<T = Record<string, unknown>>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T | undefined> {
		return await this.db._internalSendQuery<T | undefined>("get", {
			sql,
			params,
			readBigInts: options?.readBigInts,
		})
	}

	async all<T = Record<string, unknown>>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T[]> {
		return await this.db._internalSendQuery<T[]>("all", {
			sql,
			params,
			readBigInts: options?.readBigInts,
		})
	}

	async run(sql: string, params?: SqliteParams, options?: QueryOptions): Promise<RunResult> {
		return await this.db._internalSendQuery<RunResult>("run", {
			sql,
			params,
			readBigInts: options?.readBigInts,
		})
	}

	async pluck<T = SQLInputValue>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T | undefined> {
		return await this.db._internalSendQuery<T | undefined>("pluck", {
			sql,
			params,
			readBigInts: options?.readBigInts,
		})
	}

	async pluckAll<T = SQLInputValue>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T[]> {
		return await this.db._internalSendQuery<T[]>("pluckAll", {
			sql,
			params,
			readBigInts: options?.readBigInts,
		})
	}

	async exec(sql: string): Promise<void> {
		await this.db._internalSendQuery<void>("exec", { sql })
	}

	async batch(items: BatchItem[], options?: BatchOptions): Promise<unknown[]> {
		return await this.db._internalSendQuery<unknown[]>("batch", {
			items,
			atomic: options?.atomic,
		})
	}

	async iterateLimited<T = Record<string, unknown>>(
		sql: string,
		params?: SqliteParams,
		options?: IterateOptions,
	): Promise<{ columns: string[]; rows: T[]; truncated: boolean }> {
		return await this.db._internalSendQuery<{ columns: string[]; rows: T[]; truncated: boolean }>(
			"iterateLimited",
			{
				sql,
				params,
				limit: options?.limit,
				readBigInts: options?.readBigInts,
				readOnlyConnection: options?.readOnlyConnection,
				setupSql: options?.setupSql,
			},
		)
	}

	async transaction<T>(
		fn: (tx: SqliteTx) => Promise<T> | T,
		_options?: TransactionOptions,
	): Promise<T> {
		const nextDepth = this.depth + 1
		await this.db._internalSendAction("txSavepoint", { depth: nextDepth })
		const nestedTx = new SqliteTx(this.db, nextDepth)
		try {
			const result = await fn(nestedTx)
			await this.db._internalSendAction("txRelease", { depth: nextDepth })
			return result
		} catch (err) {
			try {
				await this.db._internalSendAction("txRollbackTo", { depth: nextDepth })
			} catch (_) {}
			throw err
		}
	}
}

export class SqliteDb implements SqliteQueryable {
	readonly path: string
	readonly options: Readonly<SqliteOptions>
	private readonly dbId: string
	private readonly manager: WorkerManager
	private _isClosed = false
	private lockQueue: Promise<void> = Promise.resolve()
	private initPromise: Promise<void> | null = null
	private isInitialized = false

	constructor(path: string, options: SqliteOptions = {}) {
		this.path = path
		this.options = Object.freeze({ ...options })
		this.dbId = `${path}:${nextDbSequence++}`
		this.manager = options.dedicated
			? new WorkerManager(options.idleTimeoutMs, true)
			: getSharedManager(options.idleTimeoutMs)
		this.manager.registerDb(this.dbId, this.path, this.options)
	}

	get isClosed(): boolean {
		return this._isClosed
	}

	/** Exposed for testing to inspect manager's worker state */
	get isWorkerAlive(): boolean {
		return this.manager.isWorkerAlive
	}

	private async withLock<T>(fn: () => Promise<T>): Promise<T> {
		if (this._isClosed) {
			throw new Error("Database is closed")
		}
		const previousLock = this.lockQueue
		let releaseLock: () => void
		this.lockQueue = new Promise<void>((resolve) => {
			releaseLock = resolve
		})
		await previousLock
		try {
			if (this._isClosed) {
				throw new Error("Database is closed")
			}
			return await fn()
		} finally {
			releaseLock!()
		}
	}

	private async ensureInitialized(): Promise<void> {
		if (this._isClosed) {
			throw new Error("Database is closed")
		}
		if (this.isInitialized) {
			return
		}
		if (!this.initPromise) {
			this.initPromise = (async () => {
				await this.manager.ensureDbOpen(this.dbId)
				if (this.options.init) {
					this.manager.incrementTx()
					try {
						await this.manager.sendAction(this.dbId, "txBegin", { mode: "IMMEDIATE" })
						const tx = new SqliteTx(this, 1)
						try {
							await this.options.init(tx)
							await this.manager.sendAction(this.dbId, "txCommit")
						} catch (err) {
							try {
								await this.manager.sendAction(this.dbId, "txRollback")
							} catch (_) {}
							throw err
						}
					} finally {
						this.manager.decrementTx()
					}
				}
				this.isInitialized = true
			})()
		}
		return await this.initPromise
	}

	/** Internal method used by SqliteTx to bypass outer lock during transaction */
	async _internalSendQuery<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
		if (this._isClosed) {
			throw new Error("Database is closed")
		}
		return await this.manager.sendAction<T>(this.dbId, action, payload)
	}

	/** Internal method used by SqliteTx to manage savepoints */
	async _internalSendAction(action: string, payload: Record<string, unknown> = {}): Promise<void> {
		if (this._isClosed) {
			throw new Error("Database is closed")
		}
		await this.manager.sendAction<void>(this.dbId, action, payload)
	}

	async get<T = Record<string, unknown>>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T | undefined> {
		return await this.withLock(async () => {
			await this.ensureInitialized()
			return await this.manager.sendAction<T | undefined>(this.dbId, "get", {
				sql,
				params,
				readBigInts: options?.readBigInts,
			})
		})
	}

	async all<T = Record<string, unknown>>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T[]> {
		return await this.withLock(async () => {
			await this.ensureInitialized()
			return await this.manager.sendAction<T[]>(this.dbId, "all", {
				sql,
				params,
				readBigInts: options?.readBigInts,
			})
		})
	}

	async run(sql: string, params?: SqliteParams, options?: QueryOptions): Promise<RunResult> {
		return await this.withLock(async () => {
			await this.ensureInitialized()
			return await this.manager.sendAction<RunResult>(this.dbId, "run", {
				sql,
				params,
				readBigInts: options?.readBigInts,
			})
		})
	}

	async pluck<T = SQLInputValue>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T | undefined> {
		return await this.withLock(async () => {
			await this.ensureInitialized()
			return await this.manager.sendAction<T | undefined>(this.dbId, "pluck", {
				sql,
				params,
				readBigInts: options?.readBigInts,
			})
		})
	}

	async pluckAll<T = SQLInputValue>(
		sql: string,
		params?: SqliteParams,
		options?: QueryOptions,
	): Promise<T[]> {
		return await this.withLock(async () => {
			await this.ensureInitialized()
			return await this.manager.sendAction<T[]>(this.dbId, "pluckAll", {
				sql,
				params,
				readBigInts: options?.readBigInts,
			})
		})
	}

	async exec(sql: string): Promise<void> {
		await this.withLock(async () => {
			await this.ensureInitialized()
			await this.manager.sendAction<void>(this.dbId, "exec", { sql })
		})
	}

	async batch(items: BatchItem[], options?: BatchOptions): Promise<unknown[]> {
		return await this.withLock(async () => {
			await this.ensureInitialized()
			return await this.manager.sendAction<unknown[]>(this.dbId, "batch", {
				items,
				atomic: options?.atomic,
			})
		})
	}

	async iterateLimited<T = Record<string, unknown>>(
		sql: string,
		params?: SqliteParams,
		options?: IterateOptions,
	): Promise<{ columns: string[]; rows: T[]; truncated: boolean }> {
		return await this.withLock(async () => {
			await this.ensureInitialized()
			return await this.manager.sendAction<{ columns: string[]; rows: T[]; truncated: boolean }>(
				this.dbId,
				"iterateLimited",
				{
					sql,
					params,
					limit: options?.limit,
					readBigInts: options?.readBigInts,
					readOnlyConnection: options?.readOnlyConnection,
					setupSql: options?.setupSql,
				},
			)
		})
	}

	async registerFunction(
		name: string,
		fn: SqliteFunctionHandler | string,
		options?: Omit<SqliteFunctionDef, "fn">,
	): Promise<void> {
		await this.withLock(async () => {
			await this.ensureInitialized()
			const def: SqliteFunctionDef = { fn, ...options }
			const serialized = serializeFunction(def)
			this.manager.registerFunction(this.dbId, name, serialized)
			await this.manager.sendAction<void>(this.dbId, "registerFunction", {
				name,
				def: serialized,
			})
		})
	}

	async transaction<T>(
		fn: (tx: SqliteTx) => Promise<T> | T,
		options?: TransactionOptions,
	): Promise<T> {
		return await this.withLock(async () => {
			await this.ensureInitialized()
			this.manager.incrementTx()
			try {
				await this.manager.sendAction(this.dbId, "txBegin", {
					mode: options?.mode || "IMMEDIATE",
				})
				const tx = new SqliteTx(this, 1)
				try {
					const result = await fn(tx)
					await this.manager.sendAction(this.dbId, "txCommit")
					return result
				} catch (err) {
					try {
						await this.manager.sendAction(this.dbId, "txRollback")
					} catch (_) {}
					throw err
				}
			} finally {
				this.manager.decrementTx()
			}
		})
	}

	async backup(destPath: string): Promise<void> {
		await this.withLock(async () => {
			await this.ensureInitialized()
			await this.manager.sendAction<void>(this.dbId, "backup", { destPath })
		})
	}

	async close(): Promise<void> {
		if (this._isClosed) {
			return
		}
		await this.withLock(async () => {
			if (this._isClosed) {
				return
			}
			this._isClosed = true
			await this.manager.closeDb(this.dbId)
		})
	}
}

export function openSqlite(path: string, options?: SqliteOptions): SqliteDb {
	return new SqliteDb(path, options)
}
