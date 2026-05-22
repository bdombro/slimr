import type { SyncState } from "./internal/EventBus.js"

/** High-level app shell phase derived from auth, boot, and sync state. */
export type DbAuthPhase = "logged-out" | "booting" | "initial-sync" | "ready"

export type { SyncState }
