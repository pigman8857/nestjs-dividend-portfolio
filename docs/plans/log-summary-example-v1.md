# ADB-MongoDB Compatibility Test — Log Summary Example

This document shows what the full log output looks like after exercising all MongoDB features in this project against Oracle ADB, followed by a summary table of results.

Two scenarios are shown:
- **Scenario A** — ADB is fully compatible (all features work)
- **Scenario B** — ADB is partially compatible (transactions not supported)

Logs are shown in `pino-pretty` format (`LOG_LEVEL=debug`).

---

## Scenario A — Full Compatibility

### Raw Logs

```
[09:00:00.101] INFO  (MongoOracle): Application starting...
[09:00:00.843] INFO  (MongooseConnection): [ADB-TEST] MongoDB connected to Oracle ADB
    event: "connected"

[09:00:01.012] INFO  (PriceTicksModule): [ADB-TEST] Time Series collection "price_ticks" created — ADB supports timeseries ✓
[09:00:01.034] INFO  (DividendsModule): [ADB-TEST] Time Series collection "dividends" created — ADB supports timeseries ✓
[09:00:01.201] INFO  (MongoOracle): Server running on port 3000

--- POST /users ---
[09:00:05.310] INFO  (13245): --> POST /users
[09:00:05.318] DEBUG (MongooseQuery): mongo:query
    collection: "users"  op: "save"  durationMs: 7
[09:00:05.319] INFO  (13245): <-- POST /users 201 - 9ms

--- POST /assets ---
[09:00:06.100] INFO  (13245): --> POST /assets
[09:00:06.107] DEBUG (MongooseQuery): mongo:query
    collection: "assets"  op: "save"  durationMs: 6
[09:00:06.108] INFO  (13245): <-- POST /assets 201 - 8ms

--- POST /trades/buy ---
[09:00:10.200] INFO  (13245): --> POST /trades/buy
[09:00:10.202] DEBUG (ExecuteBuyUseCase): [ADB-TEST] Starting transaction (buy)
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
[09:00:10.208] DEBUG (MongooseQuery): mongo:query
    collection: "users"  op: "findOne"  durationMs: 5
[09:00:10.215] DEBUG (MongooseQuery): mongo:query
    collection: "users"  op: "updateOne"  durationMs: 6
[09:00:10.221] DEBUG (MongooseQuery): mongo:query
    collection: "portfolios"  op: "findOne"  durationMs: 4
[09:00:10.228] DEBUG (MongooseQuery): mongo:query
    collection: "portfolios"  op: "save"  durationMs: 6
[09:00:10.234] DEBUG (MongooseQuery): mongo:query
    collection: "trades"  op: "save"  durationMs: 5
[09:00:10.235] INFO  (ExecuteBuyUseCase): [ADB-TEST] Transaction committed (buy) — ADB supports multi-doc transactions ✓
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
    shares: 10  totalAmountCents: 150000  durationMs: 33
[09:00:10.236] INFO  (13245): <-- POST /trades/buy 201 - 36ms

--- POST /trades/sell ---
[09:00:15.100] INFO  (13245): --> POST /trades/sell
[09:00:15.102] DEBUG (ExecuteSellUseCase): [ADB-TEST] Starting transaction (sell)
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
[09:00:15.108] DEBUG (MongooseQuery): mongo:query
    collection: "users"  op: "findOne"  durationMs: 5
[09:00:15.114] DEBUG (MongooseQuery): mongo:query
    collection: "portfolios"  op: "findOne"  durationMs: 4
[09:00:15.120] DEBUG (MongooseQuery): mongo:query
    collection: "users"  op: "updateOne"  durationMs: 5
[09:00:15.127] DEBUG (MongooseQuery): mongo:query
    collection: "portfolios"  op: "findOneAndUpdate"  durationMs: 6
[09:00:15.132] DEBUG (MongooseQuery): mongo:query
    collection: "trades"  op: "save"  durationMs: 4
[09:00:15.133] INFO  (ExecuteSellUseCase): [ADB-TEST] Transaction committed (sell) — ADB supports multi-doc transactions ✓
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
    shares: 5  totalAmountCents: 75000  durationMs: 31
[09:00:15.134] INFO  (13245): <-- POST /trades/sell 201 - 34ms

--- POST /price-ticks ---
[09:00:20.400] INFO  (13245): --> POST /price-ticks
[09:00:20.418] DEBUG (PriceTicksService): [ADB-TEST] Time Series insert (price_ticks) succeeded ✓
    ticker: "AAPL"  timestamp: "2026-03-13T09:00:20.000Z"  durationMs: 17
[09:00:20.419] INFO  (13245): <-- POST /price-ticks 201 - 19ms

--- POST /dividends ---
[09:00:25.300] INFO  (13245): --> POST /dividends
[09:00:25.316] DEBUG (DividendsService): [ADB-TEST] Time Series insert (dividends) succeeded ✓
    ticker: "AAPL"  durationMs: 15
[09:00:25.317] INFO  (13245): <-- POST /dividends 201 - 17ms

--- GET /price-ticks?ticker=AAPL&from=2026-01-01 ---
[09:00:30.100] INFO  (13245): --> GET /price-ticks?ticker=AAPL&from=2026-01-01
[09:00:30.122] DEBUG (MongooseQuery): mongo:query
    collection: "price_ticks"  op: "find"  durationMs: 21
[09:00:30.123] INFO  (13245): <-- GET /price-ticks 200 - 23ms

--- POST /alerts (alert creation) ---
[09:00:35.000] INFO  (13245): --> POST /alerts
[09:00:35.006] DEBUG (MongooseQuery): mongo:query
    collection: "alerts"  op: "save"  durationMs: 5
[09:00:35.007] INFO  (13245): <-- POST /alerts 201 - 7ms

--- POST /price-ticks (triggers alert) ---
[09:00:40.200] INFO  (13245): --> POST /price-ticks
[09:00:40.218] DEBUG (PriceTicksService): [ADB-TEST] Time Series insert (price_ticks) succeeded ✓
    ticker: "AAPL"  timestamp: "2026-03-13T09:00:40.000Z"  durationMs: 17
[09:00:40.222] DEBUG (MongooseQuery): mongo:query
    collection: "alerts"  op: "find"  durationMs: 3
[09:00:40.228] DEBUG (MongooseQuery): mongo:query
    collection: "alerts"  op: "updateOne"  durationMs: 5
[09:00:40.229] INFO  (AlertChangeStreamListener): Alert triggered
    alertId: "6643f1a2e4b0c3d1a8e90010"  userId: "6643f1a2e4b0c3d1a8e90001"
    assetId: "6643f1a2e4b0c3d1a8e90002"  closeCents: 16000
[09:00:40.230] INFO  (13245): <-- POST /price-ticks 201 - 30ms

--- Portfolio upsert (second buy — tests compound index + upsert) ---
[09:00:45.100] INFO  (13245): --> POST /trades/buy
[09:00:45.102] DEBUG (ExecuteBuyUseCase): [ADB-TEST] Starting transaction (buy)
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
[09:00:45.115] DEBUG (MongooseQuery): mongo:query
    collection: "portfolios"  op: "findOneAndUpdate"  durationMs: 7
[09:00:45.122] INFO  (ExecuteBuyUseCase): [ADB-TEST] Transaction committed (buy) — ADB supports multi-doc transactions ✓
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
    shares: 5  totalAmountCents: 75000  durationMs: 35
[09:00:45.123] INFO  (13245): <-- POST /trades/buy 201 - 38ms

--- Domain error (expected — tests warn log, not a MongoDB failure) ---
[09:00:50.000] INFO  (13245): --> POST /trades/buy
[09:00:50.008] DEBUG (ExecuteBuyUseCase): [ADB-TEST] Starting transaction (buy)
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
[09:00:50.014] WARN  (ExecuteBuyUseCase): [ADB-TEST] Transaction aborted (buy) — domain error, not a MongoDB failure
    userId: "6643f1a2e4b0c3d1a8e90001"  error: "InsufficientFundsError"  durationMs: 6
[09:00:50.015] WARN  (DomainExceptionFilter): Domain error
    error: "InsufficientFundsError"  message: "User ...001 has 0 cents, needs 150000 cents"  status: 422
[09:00:50.016] INFO  (13245): <-- POST /trades/buy 422 - 16ms
```

### Scenario A — Feature Summary

| # | MongoDB Feature | Result | Avg Duration |
|---|----------------|--------|-------------|
| 1 | Connection to Oracle ADB | ✅ connected | — |
| 2 | Time Series collection creation (`price_ticks`) | ✅ created | — |
| 3 | Time Series collection creation (`dividends`) | ✅ created | — |
| 4 | Standard CRUD — users insert | ✅ ok | 7ms |
| 5 | Standard CRUD — assets insert | ✅ ok | 6ms |
| 6 | Standard CRUD — alerts insert + query | ✅ ok | 5ms / 3ms |
| 7 | Multi-doc transaction — buy | ✅ committed | 33ms / 35ms |
| 8 | Multi-doc transaction — sell | ✅ committed | 31ms |
| 9 | Portfolio upsert (`findOneAndUpdate` + compound index) | ✅ ok | 7ms |
| 10 | Time Series insert (`price_ticks`) | ✅ ok | 17ms |
| 11 | Time Series insert (`dividends`) | ✅ ok | 15ms |
| 12 | Time Series query with date range filter | ✅ ok | 21ms |
| 13 | Alert trigger (EventEmitter → WebSocket) | ✅ ok | — |

**Conclusion: ADB is fully compatible with all MongoDB features used in this project.**

---

---

## Scenario B — Partial Compatibility (Transactions Not Supported)

### Raw Logs

```
[09:00:00.101] INFO  (MongoOracle): Application starting...
[09:00:00.843] INFO  (MongooseConnection): [ADB-TEST] MongoDB connected to Oracle ADB
    event: "connected"

[09:00:01.012] INFO  (PriceTicksModule): [ADB-TEST] Time Series collection "price_ticks" created — ADB supports timeseries ✓
[09:00:01.034] INFO  (DividendsModule): [ADB-TEST] Time Series collection "dividends" created — ADB supports timeseries ✓
[09:00:01.201] INFO  (MongoOracle): Server running on port 3000

--- POST /users ---
[09:00:05.310] INFO  (13245): --> POST /users
[09:00:05.318] DEBUG (MongooseQuery): mongo:query
    collection: "users"  op: "save"  durationMs: 9
[09:00:05.319] INFO  (13245): <-- POST /users 201 - 11ms

--- POST /assets ---
[09:00:06.100] INFO  (13245): --> POST /assets
[09:00:06.108] DEBUG (MongooseQuery): mongo:query
    collection: "assets"  op: "save"  durationMs: 8
[09:00:06.109] INFO  (13245): <-- POST /assets 201 - 9ms

--- POST /trades/buy (TRANSACTION FAILS) ---
[09:00:10.200] INFO  (13245): --> POST /trades/buy
[09:00:10.202] DEBUG (ExecuteBuyUseCase): [ADB-TEST] Starting transaction (buy)
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
[09:00:10.219] ERROR (ExecuteBuyUseCase): [ADB-TEST] Transaction aborted (buy) ✗
    userId: "6643f1a2e4b0c3d1a8e90001"
    error: "Transaction numbers are only allowed on a replica set member or mongos"
    durationMs: 17
[09:00:10.220] INFO  (13245): <-- POST /trades/buy 500 - 20ms

--- POST /trades/sell (TRANSACTION FAILS) ---
[09:00:15.100] INFO  (13245): --> POST /trades/sell
[09:00:15.102] DEBUG (ExecuteSellUseCase): [ADB-TEST] Starting transaction (sell)
    userId: "6643f1a2e4b0c3d1a8e90001"  assetId: "6643f1a2e4b0c3d1a8e90002"
[09:00:15.118] ERROR (ExecuteSellUseCase): [ADB-TEST] Transaction aborted (sell) ✗
    userId: "6643f1a2e4b0c3d1a8e90001"
    error: "Transaction numbers are only allowed on a replica set member or mongos"
    durationMs: 16
[09:00:15.119] INFO  (13245): <-- POST /trades/sell 500 - 19ms

--- POST /price-ticks ---
[09:00:20.400] INFO  (13245): --> POST /price-ticks
[09:00:20.419] DEBUG (PriceTicksService): [ADB-TEST] Time Series insert (price_ticks) succeeded ✓
    ticker: "AAPL"  timestamp: "2026-03-13T09:00:20.000Z"  durationMs: 18
[09:00:20.420] INFO  (13245): <-- POST /price-ticks 201 - 20ms

--- POST /dividends ---
[09:00:25.300] INFO  (13245): --> POST /dividends
[09:00:25.317] DEBUG (DividendsService): [ADB-TEST] Time Series insert (dividends) succeeded ✓
    ticker: "AAPL"  durationMs: 16
[09:00:25.318] INFO  (13245): <-- POST /dividends 201 - 18ms

--- GET /price-ticks?ticker=AAPL&from=2026-01-01 ---
[09:00:30.100] INFO  (13245): --> GET /price-ticks?ticker=AAPL&from=2026-01-01
[09:00:30.124] DEBUG (MongooseQuery): mongo:query
    collection: "price_ticks"  op: "find"  durationMs: 23
[09:00:30.125] INFO  (13245): <-- GET /price-ticks 200 - 25ms

--- POST /alerts ---
[09:00:35.000] INFO  (13245): --> POST /alerts
[09:00:35.007] DEBUG (MongooseQuery): mongo:query
    collection: "alerts"  op: "save"  durationMs: 6
[09:00:35.008] INFO  (13245): <-- POST /alerts 201 - 8ms
```

### Scenario B — Feature Summary

| # | MongoDB Feature | Result | Avg Duration | Error |
|---|----------------|--------|-------------|-------|
| 1 | Connection to Oracle ADB | ✅ connected | — | — |
| 2 | Time Series collection creation (`price_ticks`) | ✅ created | — | — |
| 3 | Time Series collection creation (`dividends`) | ✅ created | — | — |
| 4 | Standard CRUD — users insert | ✅ ok | 9ms | — |
| 5 | Standard CRUD — assets insert | ✅ ok | 8ms | — |
| 6 | Standard CRUD — alerts insert + query | ✅ ok | 6ms | — |
| 7 | **Multi-doc transaction — buy** | ❌ FAILED | 17ms | `Transaction numbers are only allowed on a replica set member or mongos` |
| 8 | **Multi-doc transaction — sell** | ❌ FAILED | 16ms | `Transaction numbers are only allowed on a replica set member or mongos` |
| 9 | Portfolio upsert | ⚠️ not tested | — | blocked by transaction failure |
| 10 | Time Series insert (`price_ticks`) | ✅ ok | 18ms | — |
| 11 | Time Series insert (`dividends`) | ✅ ok | 16ms | — |
| 12 | Time Series query with date range filter | ✅ ok | 23ms | — |
| 13 | Alert trigger (EventEmitter → WebSocket) | ✅ ok | — | — |

**Conclusion: ADB does not run as a replica set or mongos. Multi-document transactions are not supported. All other features work normally.**

---

---

## How to Read These Logs

### Grep for ADB-TEST entries only
```bash
# From a log file (JSON/production format)
cat app.log | grep '\[ADB-TEST\]'

# Or with jq for structured output
cat app.log | jq 'select(.msg | contains("[ADB-TEST]")) | {time, level, msg}'
```

### Grep for failures only
```bash
cat app.log | jq 'select(.level == 50 and (.msg | contains("[ADB-TEST]"))) | {time, msg, error}'
```

### Extract performance numbers
```bash
cat app.log | jq 'select(.durationMs != null) | {collection, op, durationMs}' | sort_by(.durationMs)
```

### Quick summary counts
```bash
echo "Successes: $(grep -c '✓' app.log)"
echo "Failures:  $(grep -c '✗' app.log)"
```

---

## Performance Baseline (Scenario A)

Observed durations from Scenario A. Use this as a baseline when comparing local MongoDB vs Oracle ADB.

| Operation | Collection | Duration |
|-----------|-----------|----------|
| Single document insert | `users`, `assets`, `alerts` | 5–9ms |
| Full transaction (buy/sell) — 4–5 round-trips | across 3 collections | 31–35ms |
| Time Series insert | `price_ticks`, `dividends` | 15–18ms |
| Time Series range query | `price_ticks` | 21–23ms |
| Portfolio upsert (`findOneAndUpdate`) | `portfolios` | 6–7ms |
| Alert query (active alerts for asset) | `alerts` | 3–5ms |

> Time Series inserts (15–18ms) are **~2–3× slower** than standard collection inserts (5–9ms). This is expected — MongoDB buckets time series documents internally, which adds overhead on write. This is normal behavior, not an ADB-specific issue.
