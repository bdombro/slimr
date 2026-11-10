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
		it("runs array migrations incrementally with user_version tracking", async () => {
			const dbPath = path.join(TEST_DIR, "migrated.db")

			// Initial migration to v1
			const db1 = trackDb(
				openSqlite(dbPath, {
					dedicated: true,
					migrations: [
						"CREATE TABLE items (id INT, val TEXT); INSERT INTO items VALUES (1, 'v1');",
					],
				}),
			)
			const row1 = await db1.get<{ val: string }>("SELECT val FROM items WHERE id = 1;")
			expect(row1?.val).toBe("v1")
			expect(await db1.pluck<number>("PRAGMA user_version;")).toBe(1)
			await db1.close()

			// Reopen with same v1: migration 1 must NOT re-run
			const db2 = trackDb(
				openSqlite(dbPath, {
					dedicated: true,
					migrations: ["INSERT INTO items VALUES (2, 'should not run');"],
				}),
			)
			expect(await db2.pluck<number>("SELECT COUNT(*) FROM items;")).toBe(1)
			await db2.close()

			// Upgrade with v2 added: only migration 2 runs
			const db3 = trackDb(
				openSqlite(dbPath, {
					dedicated: true,
					migrations: [
						"INSERT INTO items VALUES (99, 'should not run');",
						"INSERT INTO items VALUES (2, 'v2');",
					],
				}),
			)
			expect(await db3.pluck<number>("SELECT COUNT(*) FROM items;")).toBe(2)
			expect(await db3.pluck<number>("PRAGMA user_version;")).toBe(2)
		})

		it("supports consolidated/squashed record migrations and rejects stale intermediate DBs", async () => {
			const freshPath = path.join(TEST_DIR, "squashed_fresh.db")

			// Fresh DB (user_version = 0) with squashed baseline at key 3 + incremental 4
			const freshDb = trackDb(
				openSqlite(freshPath, {
					dedicated: true,
					migrations: {
						3: "CREATE TABLE items (id INT, val TEXT, tag TEXT); INSERT INTO items VALUES (1, 'base', 'v3');",
						4: "INSERT INTO items VALUES (2, 'next', 'v4');",
					},
				}),
			)
			expect(await freshDb.pluck<number>("PRAGMA user_version;")).toBe(4)
			expect(await freshDb.pluck<number>("SELECT COUNT(*) FROM items;")).toBe(2)
			await freshDb.close()

			// Existing DB at version 3 upgrading to version 4 skips key 3 and runs key 4
			const v3Path = path.join(TEST_DIR, "squashed_v3.db")
			const v3Db = trackDb(
				openSqlite(v3Path, {
					dedicated: true,
					migrations: {
						3: "CREATE TABLE items (id INT, val TEXT); INSERT INTO items VALUES (1, 'v3');",
					},
				}),
			)
			expect(await v3Db.pluck<number>("PRAGMA user_version;")).toBe(3)
			await v3Db.close()

			const upgradedDb = trackDb(
				openSqlite(v3Path, {
					dedicated: true,
					migrations: {
						3: "INSERT INTO items VALUES (99, 'must not run');",
						4: "INSERT INTO items VALUES (2, 'v4');",
					},
				}),
			)
			expect(await upgradedDb.pluck<number>("PRAGMA user_version;")).toBe(4)
			expect(await upgradedDb.pluckAll<number>("SELECT id FROM items ORDER BY id;")).toEqual([1, 2])
			await upgradedDb.close()

			// Stale DB at version 1 fails when minimum migration key is 3
			const stalePath = path.join(TEST_DIR, "stale_v1.db")
			const staleInit = trackDb(
				openSqlite(stalePath, {
					dedicated: true,
					migrations: ["CREATE TABLE items (id INT);"],
				}),
			)
			expect(await staleInit.pluck<number>("PRAGMA user_version;")).toBe(1)
			await staleInit.close()

			const staleReopen = trackDb(
				openSqlite(stalePath, {
					dedicated: true,
					migrations: {
						3: "CREATE TABLE items (id INT, extra TEXT);",
					},
				}),
			)
			await expect(staleReopen.get("SELECT 1;")).rejects.toThrow(
				/user_version \(1\) is older than minimum migration version \(3\)/,
			)
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
			expect(limited.columns).toEqual(["n"])
			expect(limited.rows).toHaveLength(5)
			expect(limited.truncated).toBe(true)
			expect(limited.rows.map((r) => r.n)).toEqual([1, 2, 3, 4, 5])

			const unlimited = await db.iterateLimited<{ n: number }>(
				"SELECT n FROM nums ORDER BY n ASC;",
				[],
				{ limit: 20 },
			)
			expect(unlimited.columns).toEqual(["n"])
			expect(unlimited.rows).toHaveLength(10)
			expect(unlimited.truncated).toBe(false)
		})

		it("returns columns even when 0 rows match", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE users (id INT, email TEXT, role TEXT);")

			const res = await db.iterateLimited<{ id: number; email: string; role: string }>(
				"SELECT id, email, role FROM users WHERE 1 = 0;",
			)
			expect(res.columns).toEqual(["id", "email", "role"])
			expect(res.rows).toEqual([])
			expect(res.truncated).toBe(false)
		})

		it("runs setupSql and enforces PRAGMA query_only on readOnlyConnection", async () => {
			const dbPath = path.join(TEST_DIR, "setup_view.db")
			const db = trackDb(openSqlite(dbPath))
			await db.exec(
				"CREATE TABLE employees (id INT, name TEXT, salary INT); INSERT INTO employees VALUES (1, 'Alice', 100), (2, 'Bob', 200);",
			)

			// setupSql creates a TEMP VIEW on read-only connection
			const res = await db.iterateLimited<{ id: number; name: string }>(
				"SELECT * FROM high_earners ORDER BY id ASC;",
				[],
				{
					readOnlyConnection: true,
					setupSql:
						"CREATE TEMP VIEW high_earners AS SELECT id, name FROM employees WHERE salary >= 150;",
				},
			)

			expect(res.columns).toEqual(["id", "name"])
			expect(res.rows).toEqual([{ id: 2, name: "Bob" }])
			expect(res.truncated).toBe(false)

			// Mutation attempt after query_only throws error
			await expect(
				db.iterateLimited("INSERT INTO employees VALUES (3, 'Charlie', 300);", [], {
					readOnlyConnection: true,
					setupSql: "CREATE TEMP VIEW dummy AS SELECT 1;",
				}),
			).rejects.toThrow(/readonly/i)
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

	describe("custom functions", () => {
		it("registers functions via options.functions and db.registerFunction", async () => {
			const db = trackDb(
				openSqlite(":memory:", {
					functions: {
						add_tax: (amount) => Number(amount) * 1.1,
						greet: {
							fn: (name) => `Hello, ${String(name)}!`,
							deterministic: true,
						},
					},
				}),
			)

			const tax = await db.pluck<number>("SELECT add_tax(100);")
			expect(tax).toBeCloseTo(110)

			const greeting = await db.pluck<string>("SELECT greet('World');")
			expect(greeting).toBe("Hello, World!")

			// Register dynamically with function and string source
			await db.registerFunction("double_it", (x) => Number(x) * 2)
			const doubled = await db.pluck<number>("SELECT double_it(21);")
			expect(doubled).toBe(42)

			await db.registerFunction("var_sum", "(...args) => args.reduce((a, b) => a + Number(b), 0)", {
				varargs: true,
			})
			const sum = await db.pluck<number>("SELECT var_sum(1, 2, 3, 4, 5);")
			expect(sum).toBe(15)
		})

		it("preserves custom functions across idleTimeoutMs worker respawns", async () => {
			const dbPath = path.join(TEST_DIR, "fn_respawn.db")
			const db = trackDb(
				openSqlite(dbPath, {
					dedicated: true,
					idleTimeoutMs: 50,
					functions: {
						cube: (x) => Number(x) ** 3,
					},
				}),
			)

			await db.registerFunction("quad", (x) => Number(x) ** 4)

			expect(await db.pluck<number>("SELECT cube(3);")).toBe(27)
			expect(await db.pluck<number>("SELECT quad(2);")).toBe(16)
			expect(db.isWorkerAlive).toBe(true)

			// Wait for idle worker termination
			await new Promise((r) => setTimeout(r, 120))
			expect(db.isWorkerAlive).toBe(false)

			// Both initial and registered functions work on transparent respawn
			expect(await db.pluck<number>("SELECT cube(4);")).toBe(64)
			expect(await db.pluck<number>("SELECT quad(3);")).toBe(81)
			expect(db.isWorkerAlive).toBe(true)
		})

		it("provides custom functions on readOnlyConnection iterateLimited", async () => {
			const dbPath = path.join(TEST_DIR, "fn_ro.db")
			const db = trackDb(
				openSqlite(dbPath, {
					functions: {
						to_upper: (s) => String(s).toUpperCase(),
					},
				}),
			)

			await db.exec("CREATE TABLE words (w TEXT); INSERT INTO words VALUES ('apple'), ('banana');")

			const res = await db.iterateLimited<{ upper_w: string }>(
				"SELECT to_upper(w) AS upper_w FROM words ORDER BY w ASC;",
				[],
				{ readOnlyConnection: true },
			)
			expect(res.rows).toEqual([{ upper_w: "APPLE" }, { upper_w: "BANANA" }])
		})
	})

	describe("named parameters", () => {
		it("supports bare, colon, and dollar named parameters", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec(
				"CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT); INSERT INTO users VALUES (1, 'Alice', 30), (2, 'Bob', 25);",
			)

			// Bare parameters: { id: 1 }
			const user1 = await db.get<{ name: string }>("SELECT name FROM users WHERE id = :id;", {
				id: 1,
			})
			expect(user1?.name).toBe("Alice")

			// Colon parameters: { ":name": "Bob" }
			const user2 = await db.get<{ age: number }>("SELECT age FROM users WHERE name = :name;", {
				":name": "Bob",
			})
			expect(user2?.age).toBe(25)

			// Dollar parameters: { "$minAge": 28 }
			const older = await db.all<{ name: string }>(
				"SELECT name FROM users WHERE age >= $minAge ORDER BY id ASC;",
				{ $minAge: 28 },
			)
			expect(older).toEqual([{ name: "Alice" }])

			// Run with bare parameters
			const updateRes = await db.run("UPDATE users SET age = :age WHERE id = :id;", {
				age: 31,
				id: 1,
			})
			expect(updateRes.changes).toBe(1)
			expect(await db.pluck<number>("SELECT age FROM users WHERE id = 1;")).toBe(31)

			// Iterate with named parameters
			const iterRes = await db.iterateLimited<{ name: string }>(
				"SELECT name FROM users WHERE age >= :minAge ORDER BY id ASC;",
				{ minAge: 20 },
			)
			expect(iterRes.rows).toHaveLength(2)

			// Batch with named parameters
			const batchRes = await db.batch([
				{
					sql: "INSERT INTO users VALUES (:id, :name, :age);",
					params: { id: 3, name: "Charlie", age: 40 },
					mode: "run",
				},
				{
					sql: "SELECT name FROM users WHERE id = :id;",
					params: { id: 3 },
					mode: "pluck",
				},
			])
			expect(batchRes[1]).toBe("Charlie")
		})
	})

	describe("pluck and pluckAll", () => {
		it("retrieves scalar values with pluck and pluckAll", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec(
				"CREATE TABLE scores (player TEXT, score INT); INSERT INTO scores VALUES ('A', 10), ('B', 20), ('C', 30);",
			)

			// pluck single value
			const count = await db.pluck<number>("SELECT count(*) FROM scores;")
			expect(count).toBe(3)

			const topPlayer = await db.pluck<string>("SELECT player FROM scores ORDER BY score DESC;")
			expect(topPlayer).toBe("C")

			// pluck on missing row returns undefined
			const missing = await db.pluck<string>("SELECT player FROM scores WHERE score > 100;")
			expect(missing).toBeUndefined()

			// pluckAll returns array of values
			const players = await db.pluckAll<string>("SELECT player FROM scores ORDER BY score ASC;")
			expect(players).toEqual(["A", "B", "C"])

			// pluckAll on empty result returns empty array
			const empty = await db.pluckAll<string>("SELECT player FROM scores WHERE 1 = 0;")
			expect(empty).toEqual([])

			// Inside transaction
			await db.transaction(async (tx) => {
				const txCount = await tx.pluck<number>("SELECT count(*) FROM scores;")
				expect(txCount).toBe(3)

				const txScores = await tx.pluckAll<number>("SELECT score FROM scores ORDER BY score ASC;")
				expect(txScores).toEqual([10, 20, 30])
			})

			// In batch
			const batchRes = await db.batch([
				{ sql: "SELECT score FROM scores WHERE player = 'B';", mode: "pluck" },
				{ sql: "SELECT score FROM scores ORDER BY score DESC;", mode: "pluckAll" },
			])
			expect(batchRes[0]).toBe(20)
			expect(batchRes[1]).toEqual([30, 20, 10])
		})
	})

	describe("transaction mode option", () => {
		it("supports DEFERRED and EXCLUSIVE transaction modes", async () => {
			const db = trackDb(openSqlite(":memory:"))
			await db.exec("CREATE TABLE ledger (entry TEXT);")

			await db.transaction(
				async (tx) => {
					await tx.run("INSERT INTO ledger VALUES ('deferred entry');")
				},
				{ mode: "DEFERRED" },
			)

			await db.transaction(
				async (tx) => {
					await tx.run("INSERT INTO ledger VALUES ('exclusive entry');")
				},
				{ mode: "EXCLUSIVE" },
			)

			const entries = await db.pluckAll<string>("SELECT entry FROM ledger ORDER BY rowid ASC;")
			expect(entries).toEqual(["deferred entry", "exclusive entry"])
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
