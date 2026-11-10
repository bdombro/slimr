import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { openSqlite, type SqliteDb } from "./index.js"

const TEST_DIR = path.join("/tmp", `slimr-sqlite-test-${Date.now()}`)

describe("@slimr/sqlite", () => {
	const openDbs: SqliteDb[] = []

	function trackDb(db: SqliteDb): SqliteDb {
		openDbs.push(db)
		return db
	}

	beforeEach(() => {
		fs.mkdirSync(TEST_DIR, { recursive: true })
	})

	afterEach(async () => {
		for (const db of openDbs) {
			if (!db.isClosed) {
				await db.close()
			}
		}
		openDbs.length = 0
		try {
			fs.rmSync(TEST_DIR, { force: true, recursive: true })
		} catch (_) {}
	})

	describe("basic queries", () => {
		it("opens :memory: database and executes get, all, run, exec", async () => {
			const db = trackDb(openSqlite(":memory:"))
			expect(db.path).toBe(":memory:")
			expect(db.isClosed).toBe(false)

			await db.exec(
				"CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age INTEGER);",
			)

			const runRes1 = await db.run("INSERT INTO users (name, age) VALUES (?, ?);", ["Alice", 30])
			expect(runRes1.changes).toBe(1)
			expect(runRes1.lastInsertRowid).toBe(1)

			const runRes2 = await db.run("INSERT INTO users (name, age) VALUES (?, ?);", ["Bob", 25])
			expect(runRes2.changes).toBe(1)
			expect(runRes2.lastInsertRowid).toBe(2)

			const user = await db.get<{ id: number; name: string; age: number }>(
				"SELECT * FROM users WHERE id = ?;",
				[1],
			)
			expect(user).toEqual({ id: 1, name: "Alice", age: 30 })
			// Prototype should be standard Object
			expect(Object.getPrototypeOf(user)).toBe(Object.prototype)

			const missing = await db.get("SELECT * FROM users WHERE id = ?;", [999])
			expect(missing).toBeUndefined()

			const allUsers = await db.all<{ id: number; name: string; age: number }>(
				"SELECT * FROM users ORDER BY id ASC;",
			)
			expect(allUsers).toHaveLength(2)
			expect(allUsers[0]).toEqual({ id: 1, name: "Alice", age: 30 })
			expect(allUsers[1]).toEqual({ id: 2, name: "Bob", age: 25 })
		})

		it("creates parent directories recursively for file databases", async () => {
			const dbPath = path.join(TEST_DIR, "nested", "sub", "test.db")
			const db = trackDb(openSqlite(dbPath))

			await db.exec("CREATE TABLE t (x INT); INSERT INTO t VALUES (42);")
			const row = await db.get<{ x: number }>("SELECT x FROM t;")
			expect(row?.x).toBe(42)
			expect(fs.existsSync(dbPath)).toBe(true)
		})

		it("throws descriptive error on invalid SQL", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await expect(db.exec("INVALID SQL STATEMENT")).rejects.toThrow()
		})
	})

	describe("init callback", () => {
		it("runs init callback once before any queries execute", async () => {
			let initCalled = 0
			const db = trackDb(
				openSqlite(":memory:", {
					init: async (tx) => {
						initCalled++
						await tx.exec("CREATE TABLE init_table (id INT, note TEXT);")
						await tx.run("INSERT INTO init_table VALUES (1, 'ready');")
					},
				}),
			)

			const row = await db.get<{ note: string }>("SELECT note FROM init_table WHERE id = 1;")
			expect(row?.note).toBe("ready")
			expect(initCalled).toBe(1)

			// Subsequent query does not re-run init
			const row2 = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM init_table;")
			expect(row2?.count).toBe(1)
			expect(initCalled).toBe(1)
		})
	})

	describe("migrations and pragmas", () => {
		it("runs migrateSql with userVersion checking", async () => {
			const dbPath = path.join(TEST_DIR, "migrated.db")

			// Initial migration to v1
			const db1 = trackDb(
				openSqlite(dbPath, {
					dedicated: true,
					userVersion: 1,
					migrateSql: "CREATE TABLE items (id INT, val TEXT); INSERT INTO items VALUES (1, 'v1');",
				}),
			)
			const row1 = await db1.get<{ val: string }>("SELECT val FROM items WHERE id = 1;")
			expect(row1?.val).toBe("v1")
			const uv1 = await db1.get<{ user_version: number }>("PRAGMA user_version;")
			expect(uv1?.user_version).toBe(1)
			await db1.close()

			// Reopen with same userVersion: migrateSql must NOT run
			const db2 = trackDb(
				openSqlite(dbPath, {
					dedicated: true,
					userVersion: 1,
					migrateSql: "INSERT INTO items VALUES (2, 'should not run');",
				}),
			)
			const count2 = await db2.get<{ cnt: number }>("SELECT COUNT(*) as cnt FROM items;")
			expect(count2?.cnt).toBe(1)
			await db2.close()

			// Upgrade to userVersion: 2: migrateSql runs
			const db3 = trackDb(
				openSqlite(dbPath, {
					dedicated: true,
					userVersion: 2,
					migrateSql: "INSERT INTO items VALUES (2, 'v2');",
				}),
			)
			const count3 = await db3.get<{ cnt: number }>("SELECT COUNT(*) as cnt FROM items;")
			expect(count3?.cnt).toBe(2)
			const uv2 = await db3.get<{ user_version: number }>("PRAGMA user_version;")
			expect(uv2?.user_version).toBe(2)
		})

		it("supports custom pragmas", async () => {
			const db = trackDb(
				openSqlite(":memory:", {
					pragmas: "PRAGMA cache_size = 500;",
				}),
			)
			const row = await db.get<{ cache_size: number }>("PRAGMA cache_size;")
			expect(row?.cache_size).toBe(500)
		})
	})

	describe("readBigInts", () => {
		it("supports per-database and per-query readBigInts", async () => {
			// Per-DB default readBigInts: true
			const dbBig = trackDb(
				openSqlite(":memory:", {
					readBigInts: true,
				}),
			)
			await dbBig.exec("CREATE TABLE nums (val INTEGER);")
			await dbBig.run("INSERT INTO nums VALUES (42);")

			const rowBig = await dbBig.get<{ val: bigint }>("SELECT val FROM nums;")
			expect(typeof rowBig?.val).toBe("bigint")
			expect(rowBig?.val).toBe(42n)

			// Query override: readBigInts: false returns number
			const rowNum = await dbBig.get<{ val: number }>("SELECT val FROM nums;", [], {
				readBigInts: false,
			})
			expect(typeof rowNum?.val).toBe("number")
			expect(rowNum?.val).toBe(42)

			// Per-DB default false, query override true
			const dbNorm = trackDb(openSqlite(":memory:"))
			await dbNorm.exec("CREATE TABLE nums (val INTEGER);")
			await dbNorm.run("INSERT INTO nums VALUES (42);")

			const rowNorm = await dbNorm.get<{ val: number }>("SELECT val FROM nums;")
			expect(typeof rowNorm?.val).toBe("number")
			expect(rowNorm?.val).toBe(42)

			const rowNormBig = await dbNorm.get<{ val: bigint }>("SELECT val FROM nums;", [], {
				readBigInts: true,
			})
			expect(typeof rowNormBig?.val).toBe("bigint")
			expect(rowNormBig?.val).toBe(42n)

			// Values > MAX_SAFE_INTEGER require readBigInts: true
			await dbBig.run("INSERT INTO nums VALUES (9007199254740993);")
			const hugeBig = await dbBig.get<{ val: bigint }>(
				"SELECT val FROM nums WHERE val > 9000000000000000;",
			)
			expect(hugeBig?.val).toBe(9007199254740993n)
			await expect(
				dbBig.get("SELECT val FROM nums WHERE val > 9000000000000000;", [], {
					readBigInts: false,
				}),
			).rejects.toThrow(/too large/i)
		})
	})

	describe("batch", () => {
		it("executes non-atomic and atomic batches", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE kv (k TEXT PRIMARY KEY, v INT);")

			// Non-atomic batch with mixed modes
			const results = await db.batch([
				{ sql: "INSERT INTO kv VALUES (?, ?);", params: ["a", 10], mode: "run" },
				{ sql: "INSERT INTO kv VALUES (?, ?);", params: ["b", 20], mode: "run" },
				{ sql: "SELECT * FROM kv WHERE k = ?;", params: ["a"], mode: "get" },
				{ sql: "SELECT * FROM kv ORDER BY k ASC;", mode: "all" },
			])

			expect(results).toHaveLength(4)
			expect((results[0] as { changes: number }).changes).toBe(1)
			expect(results[2]).toEqual({ k: "a", v: 10 })
			expect(results[3]).toEqual([
				{ k: "a", v: 10 },
				{ k: "b", v: 20 },
			])

			// Atomic batch: rolls back on error
			await expect(
				db.batch(
					[
						{ sql: "INSERT INTO kv VALUES (?, ?);", params: ["c", 30] },
						{ sql: "INSERT INTO kv VALUES (?, ?);", params: ["a", 40] }, // PRIMARY KEY conflict!
					],
					{ atomic: true },
				),
			).rejects.toThrow()

			// "c" should have been rolled back
			const checkC = await db.get("SELECT * FROM kv WHERE k = 'c';")
			expect(checkC).toBeUndefined()
		})
	})

	describe("iterateLimited", () => {
		it("truncates at limit and sets truncated boolean", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE nums (n INT);")
			for (let i = 1; i <= 10; i++) {
				await db.run("INSERT INTO nums VALUES (?);", [i])
			}

			const limited = await db.iterateLimited<{ n: number }>(
				"SELECT n FROM nums ORDER BY n ASC;",
				[],
				{ limit: 5 },
			)
			expect(limited.rows).toHaveLength(5)
			expect(limited.truncated).toBe(true)
			expect(limited.rows.map((r) => r.n)).toEqual([1, 2, 3, 4, 5])

			const unlimited = await db.iterateLimited<{ n: number }>(
				"SELECT n FROM nums ORDER BY n ASC;",
				[],
				{ limit: 20 },
			)
			expect(unlimited.rows).toHaveLength(10)
			expect(unlimited.truncated).toBe(false)
		})

		it("enforces read-only connection on file databases", async () => {
			const dbPath = path.join(TEST_DIR, "readonly_test.db")
			const db = trackDb(openSqlite(dbPath))
			await db.exec("CREATE TABLE secrets (id INT); INSERT INTO secrets VALUES (100);")

			// Query with readOnlyConnection: true succeeds for SELECT
			const res = await db.iterateLimited<{ id: number }>("SELECT id FROM secrets;", [], {
				limit: 10,
				readOnlyConnection: true,
			})
			expect(res.rows[0].id).toBe(100)

			// Attempting mutation via readOnlyConnection throws read-only error
			await expect(
				db.iterateLimited("INSERT INTO secrets VALUES (200);", [], {
					readOnlyConnection: true,
				}),
			).rejects.toThrow(/readonly/i)
		})
	})

	describe("transactions", () => {
		it("commits transaction on success", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE logs (msg TEXT);")

			await db.transaction(async (tx) => {
				await tx.run("INSERT INTO logs VALUES (?);", ["msg 1"])
				await tx.run("INSERT INTO logs VALUES (?);", ["msg 2"])
			})

			const count = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM logs;")
			expect(count?.count).toBe(2)
		})

		it("rolls back transaction on throw", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE logs (msg TEXT);")

			await expect(
				db.transaction(async (tx) => {
					await tx.run("INSERT INTO logs VALUES (?);", ["msg 1"])
					throw new Error("abort transaction")
				}),
			).rejects.toThrow("abort transaction")

			const count = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM logs;")
			expect(count?.count).toBe(0)
		})

		it("serializes concurrent transactions", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE counter (val INT); INSERT INTO counter VALUES (0);")

			const p1 = db.transaction(async (tx) => {
				const cur = (await tx.get<{ val: number }>("SELECT val FROM counter;"))!.val
				await new Promise((r) => setTimeout(r, 20))
				await tx.run("UPDATE counter SET val = ?;", [cur + 1])
			})

			const p2 = db.transaction(async (tx) => {
				const cur = (await tx.get<{ val: number }>("SELECT val FROM counter;"))!.val
				await new Promise((r) => setTimeout(r, 10))
				await tx.run("UPDATE counter SET val = ?;", [cur + 1])
			})

			await Promise.all([p1, p2])
			const finalVal = await db.get<{ val: number }>("SELECT val FROM counter;")
			expect(finalVal?.val).toBe(2)
		})

		it("queues non-transaction queries behind active transactions", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE events (order_idx INT, name TEXT);")

			const events: string[] = []

			const txPromise = db.transaction(async (tx) => {
				events.push("tx-start")
				await tx.run("INSERT INTO events VALUES (1, 'in-tx');")
				await new Promise((r) => setTimeout(r, 40))
				events.push("tx-end")
			})

			// Non-transaction query invoked while tx is active
			const nonTxPromise = (async () => {
				await new Promise((r) => setTimeout(r, 10))
				events.push("non-tx-called")
				await db.run("INSERT INTO events VALUES (2, 'outside-tx');")
				events.push("non-tx-done")
			})()

			await Promise.all([txPromise, nonTxPromise])

			// non-tx-done must happen AFTER tx-end!
			expect(events.indexOf("tx-end")).toBeLessThan(events.indexOf("non-tx-done"))

			const allEvents = await db.all<{ order_idx: number; name: string }>(
				"SELECT * FROM events ORDER BY order_idx ASC;",
			)
			expect(allEvents).toHaveLength(2)
			expect(allEvents[0].name).toBe("in-tx")
			expect(allEvents[1].name).toBe("outside-tx")
		})

		it("supports nested transactions with savepoints", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE accounts (name TEXT, balance INT);")
			await db.run("INSERT INTO accounts VALUES ('Alice', 100);")

			// Outer tx commits, nested tx rolls back
			await db.transaction(async (outerTx) => {
				await outerTx.run("UPDATE accounts SET balance = 90 WHERE name = 'Alice';")

				try {
					await outerTx.transaction(async (innerTx) => {
						await innerTx.run("UPDATE accounts SET balance = 50 WHERE name = 'Alice';")
						throw new Error("failed inside savepoint")
					})
				} catch (err: unknown) {
					expect((err as Error).message).toBe("failed inside savepoint")
				}
			})

			const alice = await db.get<{ balance: number }>(
				"SELECT balance FROM accounts WHERE name = 'Alice';",
			)
			// Alice's balance should be 90 (inner update to 50 rolled back)
			expect(alice?.balance).toBe(90)
		})
	})

	describe("backup", () => {
		it("backs up database to file and restores readable copy", async () => {
			const sourceDb = trackDb(openSqlite(":memory:"))
			await sourceDb.exec(
				"CREATE TABLE documents (id INT, title TEXT); INSERT INTO documents VALUES (1, 'test doc');",
			)

			const backupPath = path.join(TEST_DIR, "backup.sqlite")
			await sourceDb.backup(backupPath)
			expect(fs.existsSync(backupPath)).toBe(true)

			const destDb = trackDb(openSqlite(backupPath))
			const doc = await destDb.get<{ title: string }>("SELECT title FROM documents WHERE id = 1;")
			expect(doc?.title).toBe("test doc")
		})
	})

	describe("idleTimeoutMs and transparent respawn", () => {
		it("terminates idle worker and transparently respawns on next query for file DBs", async () => {
			const dbPath = path.join(TEST_DIR, "respawn.db")
			const db = trackDb(
				openSqlite(dbPath, {
					dedicated: true,
					idleTimeoutMs: 50,
				}),
			)

			await db.exec("CREATE TABLE cache (key TEXT, val TEXT);")
			await db.run("INSERT INTO cache VALUES ('k1', 'v1');")
			expect(db.isWorkerAlive).toBe(true)

			// Wait for idle timer to fire
			await new Promise((r) => setTimeout(r, 120))
			expect(db.isWorkerAlive).toBe(false)

			// Transparent query respawns worker and returns data
			const row = await db.get<{ val: string }>("SELECT val FROM cache WHERE key = 'k1';")
			expect(row?.val).toBe("v1")
			expect(db.isWorkerAlive).toBe(true)
		})

		it("keeps worker alive while :memory: DB is open, but terminates after it is closed", async () => {
			const dbPath = path.join(TEST_DIR, "file.db")
			// Create dedicated manager for testing idle behavior with memory DB
			const fileDb = trackDb(openSqlite(dbPath, { dedicated: true, idleTimeoutMs: 50 }))
			await fileDb.exec("CREATE TABLE t (x INT);")

			// Open in-memory DB sharing the same manager
			const memDb = trackDb(openSqlite(":memory:", { dedicated: true, idleTimeoutMs: 50 }))
			await memDb.exec("CREATE TABLE mem (y INT);")

			// Wait 100ms: memory DB must prevent termination
			await new Promise((r) => setTimeout(r, 100))
			expect(memDb.isWorkerAlive).toBe(true)

			await memDb.close()
			await fileDb.close()
		})
	})

	describe("close", () => {
		it("marks db as closed and rejects further queries", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE t (x INT);")
			await db.close()

			expect(db.isClosed).toBe(true)
			await expect(db.get("SELECT 1;")).rejects.toThrow("Database is closed")

			// Multiple close calls are idempotent
			await expect(db.close()).resolves.toBeUndefined()
		})
	})
})
