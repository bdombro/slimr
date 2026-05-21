# Schema evolution

[Documentation index](./README.md) · [Sync engine](./Sync.md)

`dbsync` upgrades local data in place instead of wiping IndexedDB when your model changes.

## `defaultSetter`

Normalize records on write (`add` / `put`). Useful for defaults and `updatedAt` stamps.

```typescript
// In DbSync config.tables or via DbTable.prepareCreate
db.applyDefaults("posts", partial) // shape only, no persist
```

## `migrations`

Upgrade records already on the device. Runs when IndexedDB opens (`start()` / automatic boot) so long-offline clients catch up.

Each migration is `{ version, note, upgrade(record) }`:

```typescript
import { type Migration } from "@slimr/dbsync"

const userMigrations: Migration[] = [
  {
    version: 2,
    note: "Merge firstName + lastName into fullName",
    upgrade: async (r) => {
      r.fullName = `${r.firstName} ${r.lastName}`.trim()
      delete r.firstName
      delete r.lastName
    },
  },
  {
    version: 3,
    note: "Split fullName into displayName",
    upgrade: async (r) => {
      r.displayName = r.fullName
    },
  },
]
```

Run the same chain on inbound data without persisting:

```typescript
const shaped = await db.upgradeRecord("users", importedJson)
```

## Automatic schema versioning

By default, dbsync derives a **deterministic signature** from table + index definitions. When the signature changes:

- Local IndexedDB version bumps.
- New indexes are created on existing stores (no full wipe).
- A system record is pushed through sync so other devices upgrade.

Prefer manual control? Pass an explicit **`version: number`** in `DbSync` config — that becomes authoritative instead of the signature.

Adapter details for system records: [Adapters.md](./Adapters.md).

## See also

- [Getting started](./GettingStarted.md)
- [Data access](./DataAccess.md)
- [Documentation index](./README.md)
