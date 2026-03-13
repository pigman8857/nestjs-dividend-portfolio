# MongoDB Multi-Document Transactions

## What is a Multi-Document Transaction?

A transaction is a group of operations treated as one unit — either **all succeed** or **all fail**, with no partial results visible to anyone.

MongoDB has always guaranteed atomicity on a **single document**. A single `updateOne()` either fully applies or it doesn't. The problem arises when multiple documents across multiple collections must stay consistent with each other.

---

## ACID Properties

| Property | Meaning |
|---|---|
| **Atomic** | All or nothing — no partial writes |
| **Consistent** | Database moves from one valid state to another |
| **Isolated** | Other readers never see the intermediate state |
| **Durable** | Once committed, it survives crashes |

---

## When You Need a Transaction

Any time a single business operation must write to more than one document and all writes must succeed together:

- Transferring money between two accounts
- Placing a trade (deduct cash, add shares, record trade history)
- Reserving inventory (decrement stock, create order record)
- Double-entry bookkeeping (debit one ledger row, credit another)

Without a transaction, a crash between any two writes leaves the database in a corrupt state.

---

## Requirement: Replica Set or Sharded Cluster

Multi-document ACID transactions require MongoDB to run as a **replica set** (or sharded cluster). They are not available on a standalone instance.

```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

**Why:** Transactions rely on the **oplog** (operation log) — an ordered, immutable ledger that records every write. The oplog is the mechanism that allows MongoDB to:

- Hold writes in memory during the transaction
- Commit all of them atomically as a single oplog entry
- Roll back by discarding in-memory changes if anything fails before commit

A standalone instance has no oplog, so it has no infrastructure to support transaction boundaries.

**A single-node replica set is sufficient.** You do not need multiple nodes. Running with `--replSet rs0` enables the oplog infrastructure even with one member.

---

## Basic Pattern (Mongoose / Native Driver)

```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  await ModelA.updateOne({ _id: idA }, { $inc: { balance: -amount } }, { session });
  await ModelB.updateOne({ _id: idB }, { $inc: { balance: +amount } }, { session });
  await ModelC.create([{ ...ledgerEntry }], { session });

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

Key points:
- Pass `{ session }` to **every** operation inside the transaction. Any operation without `session` runs outside the transaction and cannot be rolled back.
- Always call `session.endSession()` in `finally` to release the server-side session.
- On abort, all writes made during the transaction are discarded atomically.

---

## Project Example — Trade Buy

`POST /trades/buy` writes to three collections atomically:

```
1. users        — cashBalanceCents   -245,000  (10 shares × $245.00)
2. portfolios   — shares             +10, recalculate avg cost basis
3. trades       — insert trade document
```

If a crash occurs between step 1 and step 2, the transaction aborts and the user's cash is restored. No partial state is committed.

```typescript
const session = await this.connection.startSession();
session.startTransaction();
try {
  await this.userModel.updateOne(
    { _id: userId },
    { $inc: { cashBalanceCents: -totalCents } },
    { session },
  );
  await this.portfolioModel.findOneAndUpdate(
    { userId, assetId },
    { $inc: { shares: quantity }, $set: { avgCostCents: newAvgCost } },
    { upsert: true, session },
  );
  await this.tradeModel.create([tradeDoc], { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

---

## Local Development Setup

To enable transactions on a local Docker MongoDB container, run it as a single-node replica set:

```yaml
# docker-compose.localhost.yml
mongo:
  image: mongo:6
  command: --replSet rs0 --bind_ip_all
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "try { rs.status().ok } catch(e) { rs.initiate().ok }"]
```

The healthcheck doubles as the replica set initializer — `rs.initiate()` runs on first startup, and subsequent startups skip it because `rs.status()` succeeds.

After enabling the replica set, clients connecting from outside Docker (VS Code, mongosh, the app) must add `directConnection=true` to the URI:

```
mongodb://localhost:27017/?replicaSet=rs0&directConnection=true
```

See [time-series-and-system-buckets.md](./time-series-and-system-buckets.md) for why `directConnection=true` is needed.

---

## Common Pitfalls

| Mistake | Result |
|---|---|
| Forgetting `{ session }` on one operation | That write runs outside the transaction and cannot be rolled back |
| Not calling `endSession()` | Server-side session leak; eventually exhausts the session pool |
| Catching errors without aborting | Transaction stays open until it times out (default 60 s) |
| Running against a standalone instance | `MongoServerError` on the first `startTransaction()` call |
| Long-running transactions | MongoDB aborts transactions that exceed `transactionLifetimeLimitSeconds` (default 60 s) |
