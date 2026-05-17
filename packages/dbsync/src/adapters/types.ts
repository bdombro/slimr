export interface SyncPullResult {
	items: any[]
	hasMore: boolean
}

export interface BackendAdapter {
	checkAuth(): Promise<boolean>
	login(email: string, code: string): Promise<boolean>
	logout(): Promise<void>
	pull(cursor: string): Promise<SyncPullResult>
	push(payload: any[]): Promise<void>
}
