# Lesson Learned

---

## LL-001 — Time Series Collection Conflict on Startup

**Date:** 2026-03-13

### Issue

On application startup, the following error was thrown:

```
MongoServerError: Cannot create collection mongo_oracle.price_ticks - collection already exists.
```

The same error also affected the `dividends` collection.

### Fix

Added `autoCreate: false` to the `@Schema` decorator on both time series schemas:

```typescript
// Before
@Schema({ collection: 'price_ticks' })

// After
@Schema({ collection: 'price_ticks', autoCreate: false })
```

Files changed:
- `src/price-ticks/price-tick.schema.ts`
- `src/dividends/dividend.schema.ts`

### Knowledge

**What**
Two separate mechanisms were both trying to call `db.createCollection()` for the same collection on startup, causing a conflict.

**Why**
Mongoose has `autoCreate: true` by default. When `MongooseModule.forFeature()` registers a schema, Mongoose automatically creates the collection as a plain collection. Separately, `onModuleInit()` in each module also calls `createCollection()` — but with the required timeseries options. Whichever runs second throws because the collection already exists.

**How**
Setting `autoCreate: false` disables Mongoose's automatic collection creation. The `onModuleInit()` in each module becomes the sole creator of the collection, calling `db.createCollection()` with the correct timeseries options. The guard (`listCollections` check) inside `onModuleInit()` prevents any duplicate creation.

**When**
This happens only on the first startup when the collections do not yet exist. The race between Mongoose's `autoCreate` and `onModuleInit` is non-deterministic — either can win depending on timing.

**Where**
This only affects Time Series collections. Normal Mongoose collections can use `autoCreate: true` safely because they have no special creation options. Time Series collections must be created with `timeseries` options declared upfront and cannot be converted after the fact.

---

## LL-002 — Multi-Document Transactions Fail on Standalone MongoDB

**Date:** 2026-03-13

### Issue

`POST /trades/buy` returned a 500 error with the following message:

```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

### Fix

Configured the MongoDB container in `docker-compose.localhost.yml` to run as a single-node replica set:

```yaml
# Before
mongo:
  image: mongo:6
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]

# After
mongo:
  image: mongo:6
  command: --replSet rs0 --bind_ip_all
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "try { rs.status().ok } catch(e) { rs.initiate().ok }"]
```

The healthcheck now doubles as the replica set initializer — `rs.initiate()` runs on first startup, and subsequent startups skip it because `rs.status()` succeeds.

File changed:
- `docker-compose.localhost.yml`

### Knowledge

**What is a Multi-Document Transaction**
A transaction is a group of operations treated as one unit — either all succeed or all fail, with no partial results visible to anyone.

MongoDB has always guaranteed atomicity on a **single document**. A single `updateOne()` either fully applies or it doesn't. The problem arises when multiple documents across multiple collections must stay consistent with each other.

In this project, `POST /trades/buy` must write to three places atomically:

```
1. User.cashBalanceCents     -245,000  (10 shares × 24,500)
2. Portfolio.shares          +10
3. Trade document            inserted
```

Without a transaction, a crash between any two steps leaves the database in a corrupt state — cash deducted but no shares recorded, or shares added but no trade history. A transaction ensures all three land together or none of them do.

This property is described by **ACID**:

| Property | Meaning |
|---|---|
| Atomic | All or nothing — no partial writes |
| Consistent | Database moves from one valid state to another |
| Isolated | Other readers never see the intermediate state |
| Durable | Once committed, it survives crashes |

**What (the issue)**
Multi-document ACID transactions in MongoDB require the server to be running as a replica set (or sharded cluster). They are not supported on a standalone instance.

**Why**
Transactions rely on the **oplog** (operation log) — an ordered, immutable ledger that records every write. The oplog is the mechanism that allows MongoDB to:
- Hold writes in memory during the transaction
- Commit all of them atomically as a single oplog entry
- Roll back by discarding in-memory changes if anything fails before commit

A standalone instance has no oplog, so it has no infrastructure to support transaction boundaries.

**How**
A single-node replica set is sufficient. You do not need multiple nodes. Running with `--replSet rs0` enables the oplog infrastructure even with one member. `rs.initiate()` bootstraps the replica set on first startup. After that, the instance behaves exactly like a standalone for all practical purposes, except transactions now work.

**When**
This affects any operation that uses `session.startTransaction()`. In this project, that is every trade write — both buy and sell — because they must update three collections atomically: `users`, `portfolios`, and `trades`.

**Where**
This is a MongoDB server-level requirement, not a Mongoose or NestJS limitation. Any MongoDB client (Mongoose, the native driver, mongosh) will get this error when attempting a transaction against a standalone instance, regardless of how the application is written.

---

## LL-003 — Cannot Connect to MongoDB After Enabling Replica Set

**Date:** 2026-03-13

### Issue

After enabling the replica set in `docker-compose.localhost.yml`, both the VS Code MongoDB extension and the NestJS application could no longer connect to `mongodb://localhost:27017`.

### Fix

Added `directConnection=true` to the connection string:

```
mongodb://localhost:27017/?replicaSet=rs0&directConnection=true
```

This applies to:
- VS Code MongoDB extension connection string
- `MONGO_URI` in `.env`

### Knowledge

**What**
When MongoDB runs as a replica set, the driver performs **topology discovery** — it asks the server who the other members are and what the primary is. The server responds with the hostname it knows itself by, which inside a Docker container is the internal container hostname (e.g. `a3f2c1d4e5b6`), not `localhost`. The driver then tries to connect to that internal hostname, which is unreachable from the host machine.

**Why**
This is by design — in a real multi-node replica set, topology discovery lets the driver find the primary automatically even if a failover has occurred. It is the correct behavior for production. For local development with a single container exposed via port mapping, it is an obstacle.

**How**
`directConnection=true` tells the driver to skip topology discovery and connect directly to the address given in the URI, treating it as the primary. The driver does not ask for or follow advertised hostnames.

**When**
This affects any client connecting to a replica set from outside its network — typically local development where MongoDB runs in Docker with a port mapped to `localhost`.

**Where**
Both the application `MONGO_URI` and any external tools (MongoDB extension, mongosh, Compass) need `directConnection=true` when connecting to a Dockerized replica set from the host machine.

---

## LL-004 — Change Stream Not Supported on Time Series Collections

**Date:** 2026-03-13

### Issue

On application startup, the following unhandled error was thrown and crashed the process:

```
MongoServerError: Namespace mongo_oracle.price_ticks is a timeseries collection
code: 166, codeName: 'CommandNotSupportedOnView'
```

The error was emitted from the `ChangeStream` instance in `AlertChangeStreamListener`.

### Fix

Changed the change stream from watching the collection directly to watching at the database level with a pipeline filter:

```typescript
// Before
this.changeStream = db.collection('price_ticks').watch([], { fullDocument: 'updateLookup' });

// After
this.changeStream = db.watch(
  [{ $match: { 'ns.coll': 'price_ticks', operationType: 'insert' } }],
  { fullDocument: 'updateLookup' },
);
```

File changed:
- `src/alerts/infrastructure/alert-change-stream.listener.ts`

### Knowledge

**What**
Calling `.watch()` directly on a time series collection throws error 166 `CommandNotSupportedOnView`. The change stream never opens, and the unhandled `error` event crashes the process.

**Why**
Under the hood, a MongoDB time series collection is a **view** over an internal `system.buckets.<name>` bucket collection. Change Streams cannot be opened on views — only on real collections, databases, or the full deployment.

**How**
Watch at the database level instead. A database-level change stream receives events for all collections in that database, including writes into time series collections. A `$match` stage filters the stream down to only `insert` events on the `price_ticks` namespace. The shape of the resulting change documents is identical, so no downstream handler code needed to change.

**When**
This affects any code that calls `.watch()` on a time series collection. The error occurs at stream initialization (on startup), not at insert time.

**Where**
This is a MongoDB server-level restriction. Any MongoDB client attempting `.watch()` on a time series collection will get this error. The workaround (database-level watch + `$match`) is driver-agnostic.
