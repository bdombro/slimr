# Data Modeling

[Documentation index](./README.md) · [Data access](./DataAccess.md)

Because `@slimr/dbsync` uses IndexedDB under the hood, it is a **NoSQL Document Store**, not a relational SQL database. This means there are no `JOIN` operations, foreign key constraints, or cascaded deletes built into the database layer.

Here are common strategies for modeling relations in an offline-first NoSQL database.

Examples that read or write assume `await db.waitForBooted()` has already run (and `db.auth.isLoggedIn` when using `RestAdapter`).

## 1:1 and 1:N (One-to-Many)

When a record belongs to another record (e.g. a `Post` belongs to a `User`, or a `Comment` belongs to a `Post`), the standard approach is to store the parent's ID on the child and create an **index**.

```typescript
class CommentTable extends DbTable<Comment, CommentCreateInput> {
    static tableName = "comments"
    // Create an index on postId for fast lookups
    static indexes = ["postId", "createdAt"]
}
```

To fetch a post and its comments:

```typescript
await db.waitForBooted()

const post = await db.posts.get(postId)

// Fetch comments using the index
const comments = await db.comments.find({
    index: "postId",
    lowerBound: postId,
    upperBound: postId,
})

// Or using the helper:
const comments = await db.comments.getBy("postId", postId)
```

## Denormalization

If the child data is small, bounded, and always fetched with the parent, consider **denormalizing** (embedding) the data directly into the parent document instead of creating a separate table.

```typescript
// Instead of a separate TagTable, just store tags on the Post
interface Post {
    id: string
    content: string
    tags: string[] // Embedded array
}
```

**Trade-offs:** 
- Embedded arrays are fast to read.
- However, if a tag name needs to be updated globally, you would need to scan and update every post that contains it.
- IndexedDB does not easily support indexing *inside* arrays natively in `dbsync` without multi-entry indexes (which `dbsync` doesn't currently wrap).

## M:N (Many-to-Many)

For many-to-many relationships (e.g. `Users` and `Teams`), you have two main options:

### Option A: Arrays of IDs

If the number of relations per record is small (e.g., a user is typically in <10 teams):

```typescript
interface User {
    id: string
    name: string
    teamIds: string[] // Array of foreign keys
}
```

To find the teams for a user, you fetch the user, then fetch the teams individually:

```typescript
await db.waitForBooted()

const user = await db.users.get(userId)
const teams = await Promise.all(
    user.teamIds.map(id => db.teams.get(id))
)
```

### Option B: Join Tables

If the relationship carries extra metadata (e.g. `role` in the team) or is unbounded, create a "join" table.

```typescript
interface TeamMember {
    id: string
    teamId: string
    userId: string
    role: "admin" | "member"
}

class TeamMemberTable extends DbTable<TeamMember, any> {
    static tableName = "teamMembers"
    static indexes = ["teamId", "userId"]
}
```

To fetch all members of a team:

```typescript
await db.waitForBooted()

const memberships = await db.teamMembers.getBy("teamId", teamId)
const users = await Promise.all(
    memberships.map(m => db.users.get(m.userId))
)
```

## Transactions

If you need to update multiple related records simultaneously (e.g. deleting a `Post` and all its `Comments`), use transactions to ensure they enter the mutation queue atomically.

```typescript
await db.waitForBooted()

const tx = db.getTransaction()

tx.posts.delete(postId)

const comments = await db.comments.getBy("postId", postId)
for (const comment of comments) {
    tx.comments.delete(comment.id)
}

await tx.commit()
```

## See also

- [Data access](./DataAccess.md)
- [Schema evolution](./Schema.md)