# MongoDB Time Series Collections & system.buckets.*

## What are `system.buckets.dividends` and `system.buckets.price_ticks`?

These are **internal storage collections** automatically created by MongoDB when you define a Time Series collection. You never interact with them directly.

When you create a Time Series collection (e.g. `price_ticks` or `dividends`), MongoDB sets up two things:

1. **The "view" collection** — what you see and query: `price_ticks`, `dividends`
2. **The internal bucket collection** — the actual on-disk storage: `system.buckets.price_ticks`, `system.buckets.dividends`

MongoDB automatically **groups ("buckets") your documents** by time window and metadata into large compressed documents behind the scenes.

---

## Normal Document vs. Bucket Document

**What you insert** into `price_ticks` (three separate logical documents):

```json
{ "timestamp": "2024-01-01T10:00:00Z", "metadata": { "ticker": "AAPL" }, "closeCents": 18000 }
{ "timestamp": "2024-01-01T11:00:00Z", "metadata": { "ticker": "AAPL" }, "closeCents": 18100 }
{ "timestamp": "2024-01-01T12:00:00Z", "metadata": { "ticker": "AAPL" }, "closeCents": 17900 }
```

**What is actually stored** in `system.buckets.price_ticks` (one bucket = many ticks):

```json
{
  "_id": ObjectId("..."),
  "control": {
    "min": { "timestamp": "2024-01-01T10:00:00Z", "closeCents": 17900 },
    "max": { "timestamp": "2024-01-01T12:00:00Z", "closeCents": 18100 }
  },
  "meta": { "ticker": "AAPL" },
  "data": {
    "timestamp": { "0": "2024-01-01T10:00:00Z", "1": "2024-01-01T11:00:00Z", "2": "2024-01-01T12:00:00Z" },
    "closeCents": { "0": 18000, "1": 18100, "2": 17900 }
  }
}
```

Multiple ticks sharing the same `metadata` and a close time window are packed into one bucket using **columnar compression**.

---

## Comparison Table

| | Normal Collection | Time Series (view) | `system.buckets.*` |
|---|---|---|---|
| You insert/query it | Yes | Yes | **Never** |
| 1 document = 1 record | Yes | Yes | **No** — 1 bucket = many records |
| Supports `.watch()` | Yes | **No** (error 166) | Technically yes, but bucket-level payloads |
| Indexes | Normal | Time + meta auto-indexed | Internal |
| Compression | No | **Yes** — columnar | Actual compressed storage |

---

## Why This Matters in This Project

This is why `PriceTicksService` uses an **application-level event** (`EventEmitter2`) instead of a MongoDB Change Stream to trigger alerts.

Calling `.watch()` on a Time Series collection fails:

```
MongoServerError: not supported on a time-series collection (error 166 CommandNotSupportedOnView)
```

Watching the database and filtering by `ns.coll: 'price_ticks'` also does not work — the Change Stream surfaces events under `ns.coll: 'system.buckets.price_ticks'` with **bucket-level** payloads (not individual document inserts), making it impractical to react to individual price ticks.

The application-level event pattern avoids all of these constraints:

```
PriceTicksService.create()
  → emits 'price_tick.inserted'
    → AlertChangeStreamListener.@OnEvent('price_tick.inserted')
      → checks active alerts
        → emits 'alert.triggered'
          → AlertsGateway broadcasts via WebSocket
```

---

## Rules

- **Never** read from or write to `system.buckets.*` collections directly.
- **Never** drop and recreate Time Series collections without migrating the data — bucket documents are not human-readable and cannot be restored by re-inserting from the view.
- Use `db.createCollection()` with `timeseries` options on startup (via `OnModuleInit`) to create these collections idempotently. See `src/price-ticks/infrastructure/` and `src/dividends/infrastructure/` for the pattern.
