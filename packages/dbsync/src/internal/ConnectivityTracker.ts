type ConnectivityListener = (offline: boolean) => void

/**
 * Tracks browser online/offline state and notifies listeners.
 */
export class ConnectivityTracker {
	private offlineValue = typeof navigator !== "undefined" ? navigator.onLine === false : false
	private listeners = new Set<ConnectivityListener>()

	constructor() {
		if (typeof window === "undefined") return
		const onOnline = () => this.setOffline(false)
		const onOffline = () => this.setOffline(true)
		window.addEventListener("online", onOnline)
		window.addEventListener("offline", onOffline)
	}

	/** Whether the browser reports offline connectivity. */
	public get offline() {
		return this.offlineValue
	}

	/** Whether the browser reports online connectivity. */
	public get online() {
		return !this.offlineValue
	}

	/** Subscribes to connectivity changes. */
	public subscribe(listener: ConnectivityListener) {
		this.listeners.add(listener)
		return { close: () => this.listeners.delete(listener) }
	}

	private setOffline(offline: boolean) {
		if (this.offlineValue === offline) return
		this.offlineValue = offline
		this.listeners.forEach((listener) => listener(offline))
	}
}
