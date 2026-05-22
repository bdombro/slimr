import type { BackendAdapter } from "../adapters/types.js"
import type { DbSyncConfig } from "../dbSyncConfig.js"
import { promiseWithResolvers } from "../util/promises.js"
import type { AuthManager } from "./AuthManager.js"
import { readLastSuccessAt, writeLastSuccessAt } from "./authStorage.js"
import type { ConnectivityTracker } from "./ConnectivityTracker.js"
import { emitDebug } from "./debug.js"
import type { EventBus, SyncState } from "./EventBus.js"
import type { StorageManager } from "./storage/index.js"
import { getSchemaSignature } from "./storage/index.js"

type SchemaTable = {
	tableName: string
	indexes?: string[]
}

/**
 * Coordinates periodic pull/push sync cycles against the configured backend.
 */
export class SyncEngine {
	/** The active interval handle, or `null` when sync is disabled. */
	private syncSetInterval: any = null
	/** Playwright/tests may replace one cycle's work to simulate leader lock contention. */
	private performSyncHook: (() => Promise<void>) | null = null

	/**
	 * Creates a sync engine bound to the given storage, auth, and adapter instances.
	 */
	constructor(
		private config: DbSyncConfig,
		private getSyncInterval: () => number,
		private events: EventBus,
		private storage: StorageManager,
		private auth: AuthManager,
		private connectivity: ConnectivityTracker,
		private adapter: BackendAdapter,
		private onSchemaChange: () => void,
		private getSchemaTables: () => SchemaTable[],
	) {}

	/** Starts periodic synchronization if it is not already running. */
	public start() {
		if (!this.syncSetInterval) {
			this.syncSetInterval = setInterval(() => this.sync(), this.getSyncInterval())
			void this.sync()
		}
	}

	/** Stops periodic synchronization if it is currently running. */
	public stop() {
		if (this.syncSetInterval) {
			clearInterval(this.syncSetInterval)
			this.syncSetInterval = null
		}
	}

	/** Whether the sync timer is currently active. */
	public get isStarted() {
		return !!this.syncSetInterval
	}

	/** Whether the last successful sync is still considered fresh. */
	public get isLive() {
		const lastSuccess = readLastSuccessAt()
		if (!lastSuccess) return false
		return Date.now() - new Date(lastSuccess).getTime() < this.getSyncInterval() * 4
	}

	/** Waits until the engine reports a live connection or rejects if disabled. */
	public async waitForLive(): Promise<void> {
		const { promise, resolve, reject } = promiseWithResolvers<void>()
		if (!this.isStarted) {
			reject(new Error("Sync disabled"))
			return promise
		}
		const check = setInterval(() => {
			if (this.isLive) {
				clearInterval(check)
				resolve()
			}
		}, this.getSyncInterval())
		return promise
	}

	/** Triggers a single sync cycle immediately. */
	public async triggerSync() {
		await this.sync()
	}

	/** Replaces `performSync` body until cleared (`null`). For Playwright leader-election tests. */
	public setPerformSyncHook(fn: (() => Promise<void>) | null) {
		this.performSyncHook = fn
	}

	/** Runs one sync pass, optionally under a Web Locks leader lock. */
	private async sync() {
		if (typeof navigator !== "undefined" && navigator.locks) {
			await navigator.locks.request("dbsync-leader", async () => {
				await this.performSync()
			})
		} else {
			await this.performSync()
		}
	}

	/** Performs pull, push, and sync-state bookkeeping for one cycle. */
	private async performSync() {
		if (this.performSyncHook) {
			await this.performSyncHook()
			return
		}
		if (this.connectivity.offline) {
			this.setSyncState("offline")
			emitDebug(this.config.onDebug, {
				type: "sync:cycle",
				phase: "skipped",
				reason: "offline",
			})
			return
		}
		if (!this.auth.canSync()) {
			emitDebug(this.config.onDebug, { type: "sync:cycle", phase: "skipped", reason: "auth" })
			return
		}

		emitDebug(this.config.onDebug, { type: "sync:cycle", phase: "start" })
		this.setSyncState("syncing")
		try {
			const pullCount = await this.syncPull()
			emitDebug(this.config.onDebug, { type: "sync:cycle", phase: "pull", pullCount })
			const pushCount = await this.syncPush()
			emitDebug(this.config.onDebug, { type: "sync:cycle", phase: "push", pushCount })
			this.setSyncState("idle")
			writeLastSuccessAt(new Date().toISOString())
			this.auth.notifySessionChange()
			emitDebug(this.config.onDebug, { type: "sync:cycle", phase: "done" })
		} catch (err: any) {
			emitDebug(this.config.onDebug, { type: "sync:error", error: err })
			if (err.status === 401) {
				await this.auth.invalidateSession("401")
				this.stop()
			}
			this.setSyncState(this.connectivity.offline ? "offline" : "error")
		}
	}

	private setSyncState(state: SyncState) {
		this.events.setState(state)
		emitDebug(this.config.onDebug, { type: "sync:state", state })
	}

	/** Computes the local schema signature used for version handshakes. */
	private get schemaSignature() {
		return getSchemaSignature(this.getSchemaTables(), "tableName")
	}

	/** Pulls remote changes and applies them to IndexedDB. Returns total items applied. */
	private async syncPull() {
		let totalPulled = 0
		let hasMore = true
		while (hasMore) {
			const cursor = localStorage.getItem("dbsync-pullSyncedUpTo") || ""
			const data = await this.adapter.pull(cursor)

			if (data.items && data.items.length > 0) {
				totalPulled += data.items.length
				const tx = this.storage.getTransaction()
				data.items.forEach((post: any) => {
					if (post.variant === "__dbsync_system" && post.id === "version") {
						const remoteContent = JSON.parse(post.content)
						if (this.config.version !== undefined) {
							if (remoteContent.version && remoteContent.version > this.config.version) {
								this.onSchemaChange()
							}
						} else {
							const currentSignature = this.schemaSignature
							if (remoteContent.signature && remoteContent.signature !== currentSignature) {
								this.onSchemaChange()
							}
						}
						return
					}
					const storeName = post.variant
					if (post.isDeleted) tx.delete(storeName, post.id)
					else tx.put(storeName, { id: post.id, ...JSON.parse(post.content) })
				})
				await tx.commit()
				localStorage.setItem("dbsync-pullSyncedUpTo", data.items[data.items.length - 1].updatedAt)
			}
			hasMore = data.hasMore
		}
		return totalPulled
	}

	/** Pushes queued local mutations to the backend and clears the queues. Returns payload size. */
	private async syncPush() {
		const dirty = await this.storage.find<any>("dirtyQueue")
		const deleted = await this.storage.find<any>("deletedQueue")

		const payload = [
			...dirty.map((d) => ({
				id: d.id,
				variant: d.table,
				content: JSON.stringify(d.payload),
				isDeleted: false,
				updatedAt: new Date(d.timestamp).toISOString(),
			})),
			...deleted.map((d) => ({
				id: d.id,
				variant: d.table,
				content: "{}",
				isDeleted: true,
				updatedAt: new Date(d.timestamp).toISOString(),
			})),
		]

		if (this.config.version !== undefined) {
			const localVersion = Number(localStorage.getItem("dbsync-version") || "0")
			if (this.config.version > localVersion) {
				payload.push({
					id: "version",
					variant: "__dbsync_system",
					content: JSON.stringify({ version: this.config.version }),
					isDeleted: false,
					updatedAt: new Date().toISOString(),
				})
			}
		} else {
			const currentSignature = this.schemaSignature
			const storedSyncSig = localStorage.getItem("dbsync-sync-signature") || ""
			if (currentSignature !== storedSyncSig) {
				payload.push({
					id: "version",
					variant: "__dbsync_system",
					content: JSON.stringify({ signature: currentSignature }),
					isDeleted: false,
					updatedAt: new Date().toISOString(),
				})
			}
		}

		if (payload.length > 0) {
			await this.adapter.push(payload)

			if (this.config.version !== undefined)
				localStorage.setItem("dbsync-version", String(this.config.version))
			else localStorage.setItem("dbsync-sync-signature", this.schemaSignature)

			const tx = this.storage.getTransaction()
			dirty.forEach((d) => tx.delete("dirtyQueue", d.id))
			deleted.forEach((d) => tx.delete("deletedQueue", d.id))
			await tx.commit()
		}
		return payload.length
	}
}
