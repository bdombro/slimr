import { Observable } from "@slimr/observable"

/**
 * Sync lifecycle observables for a single `DbSync` instance (`isStarted`, `isLive`).
 * Sync **state** (`idle` | `syncing` | …) lives on `EventBus.state$`.
 */
export class SyncObservables {
	readonly isStarted$: Observable<boolean>
	readonly isLive$: Observable<boolean>

	constructor(instanceId: string) {
		const p = `dbsync-${instanceId}`
		this.isStarted$ = new Observable(`${p}-syncStarted`, false)
		this.isLive$ = new Observable(`${p}-syncLive`, false)
	}
}
