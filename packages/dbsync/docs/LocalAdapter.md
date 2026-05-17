# LocalAdapter

`LocalAdapter` is the no-op backend adapter shipped with `@slimr/dbsync`.

It exists for consumer apps that want the full IndexedDB ORM, reactive updates, repositories, and transactions without any remote sync backend. It satisfies the `BackendAdapter` contract but intentionally never talks to a server.

Use it when your app is local-only or when you want to disable sync in certain environments.