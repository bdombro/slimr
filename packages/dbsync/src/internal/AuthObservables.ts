import { Observable } from "@slimr/observable"
import type { DbAuthPhase } from "../authTypes.js"

/**
 * Per-field session/auth observables for a single `DbSync` instance.
 * Names are prefixed with `dbsync-{instanceId}-` to avoid `globalThis.observables` collisions.
 */
export class AuthObservables {
	readonly phase$: Observable<DbAuthPhase>
	readonly isInitialSyncPending$: Observable<boolean>
	readonly canQuery$: Observable<boolean>
	readonly isLoggedIn$: Observable<boolean>
	readonly isReady$: Observable<boolean>
	readonly isBooted$: Observable<boolean>
	readonly isBootstrapping$: Observable<boolean>
	readonly pendingLogout$: Observable<boolean>
	readonly offline$: Observable<boolean>
	readonly online$: Observable<boolean>

	constructor(instanceId: string) {
		const p = `dbsync-${instanceId}`
		this.phase$ = new Observable(`${p}-phase`, "logged-out" as DbAuthPhase)
		this.isInitialSyncPending$ = new Observable(`${p}-isInitialSyncPending`, false)
		this.canQuery$ = new Observable(`${p}-canQuery`, false)
		this.isLoggedIn$ = new Observable(`${p}-isLoggedIn`, false)
		this.isReady$ = new Observable(`${p}-isReady`, false)
		this.isBooted$ = new Observable(`${p}-isBooted`, false)
		this.isBootstrapping$ = new Observable(`${p}-isBootstrapping`, false)
		this.pendingLogout$ = new Observable(`${p}-pendingLogout`, false)
		this.offline$ = new Observable(`${p}-offline`, false)
		this.online$ = new Observable(`${p}-online`, true)
	}
}
