# Domain Model

This document describes the business domains for the **High-Yield Portfolio & Dividend Tracker** — a financial app that tracks investment portfolios, trades, and dividend yields for high-yield ETFs and funds.

---

## Domains Overview

| Domain | Collection | Type | Description |
|--------|------------|------|-------------|
| `users` | `users` | Standard | User accounts and cash balances |
| `assets` | `assets` | Standard | ETF/fund metadata |
| `portfolios` | `portfolios` | Standard | User holdings (positions) |
| `trades` | `trades` | Standard | Immutable buy/sell transaction log |
| `price-ticks` | `price_ticks` | Time Series | Daily OHLCV price data per asset |
| `dividends` | `dividends` | Time Series | Historical dividend payouts per asset |
| `alerts` | `alerts` | Standard | Price threshold alerts per user per asset |

---

## Design Decisions

- **Cents everywhere** — all monetary values are stored as integers in cents (e.g. `$1.50` → `150`) to avoid floating-point precision issues.
- **Trades are immutable** — trade documents are never updated after insertion. All writes must go inside a multi-document transaction (see [Trades](#trades)).
- **Time Series collections** — `price_ticks` and `dividends` use MongoDB's native Time Series collection type. Their collections are auto-created on `onModuleInit` if they do not already exist.

---

## Users

**File:** `src/users/user.schema.ts`

Represents a registered user and their available cash balance.

| Field | Type | Notes |
|-------|------|-------|
| `email` | `string` | Unique |
| `name` | `string` | |
| `cashBalanceCents` | `number` | Available cash in cents. Deducted on buy, increased on sell — always inside a transaction |

---

## Assets

**File:** `src/assets/asset.schema.ts`

Represents a tradeable ETF or fund.

| Field | Type | Notes |
|-------|------|-------|
| `ticker` | `string` | Unique, stored uppercase (e.g. `JEPI`) |
| `name` | `string` | Full fund name |
| `type` | `'ETF' \| 'FUND'` | |
| `sector` | `string` | Optional |
| `expenseRatio` | `number` | Annual rate as decimal (e.g. `0.0035` = 0.35%) |
| `dividendFrequency` | `'monthly' \| 'quarterly' \| 'annual'` | |
| `currentPriceCents` | `number` | Latest known price in cents |

---

## Portfolios

**File:** `src/portfolios/portfolio.schema.ts`

Represents a user's open position in a single asset. One document per user per asset enforced by a compound unique index.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | `ObjectId` | ref: `User` |
| `assetId` | `ObjectId` | ref: `Asset` |
| `shares` | `number` | Supports fractional shares |
| `averageCostBasisCents` | `number` | Volume-weighted average cost per share in cents |

**Indexes:**
- `{ userId, assetId }` — unique compound index (one position per user per asset)

---

## Trades

**File:** `src/trades/trade.schema.ts`

An immutable ledger of every buy and sell. Never updated — only inserted.

Every trade write **must** use a multi-document transaction to atomically:
- **Buy:** deduct `cashBalanceCents` from `User` + upsert `shares` in `Portfolio`
- **Sell:** add `cashBalanceCents` to `User` + reduce `shares` in `Portfolio`

| Field | Type | Notes |
|-------|------|-------|
| `userId` | `ObjectId` | ref: `User` |
| `assetId` | `ObjectId` | ref: `Asset` |
| `type` | `'buy' \| 'sell'` | |
| `shares` | `number` | |
| `pricePerShareCents` | `number` | Execution price in cents |
| `totalAmountCents` | `number` | `shares × pricePerShareCents` |
| `executedAt` | `Date` | |

**Indexes:**
- `{ userId, executedAt: -1 }` — user trade history sorted by latest
- `{ assetId, executedAt: -1 }` — asset trade history sorted by latest

---

## Price Ticks *(Time Series)*

**File:** `src/price-ticks/price-tick.schema.ts`

Stores high-frequency OHLCV price data per asset. Uses MongoDB's native Time Series collection for efficient time-range queries and storage compression.

| Field | Type | Notes |
|-------|------|-------|
| `timestamp` | `Date` | **timeField** — required by time series |
| `metadata.ticker` | `string` | **metaField** — groups the series by asset |
| `metadata.assetId` | `string` | |
| `openCents` | `number` | Opening price in cents |
| `highCents` | `number` | |
| `lowCents` | `number` | |
| `closeCents` | `number` | Closing price in cents — watched by Change Streams for alerts |
| `volume` | `number` | |

**Time Series options:** `timeField: timestamp` · `metaField: metadata` · `granularity: hours`

---

## Dividends *(Time Series)*

**File:** `src/dividends/dividend.schema.ts`

Historical dividend payout records per asset. Uses MongoDB's native Time Series collection.

| Field | Type | Notes |
|-------|------|-------|
| `exDate` | `Date` | **timeField** — ex-dividend date; shares must be held before this date to qualify |
| `metadata.ticker` | `string` | **metaField** |
| `metadata.assetId` | `string` | |
| `amountPerShareCents` | `number` | Dividend amount per share in cents |
| `paymentDate` | `Date` | Date cash is credited to accounts |
| `frequency` | `'monthly' \| 'quarterly' \| 'annual'` | |

**Time Series options:** `timeField: exDate` · `metaField: metadata` · `granularity: hours`

---

## Alerts

**File:** `src/alerts/alert.schema.ts`

Price threshold alerts. A Change Stream watches the `price_ticks` collection and fires a WebSocket notification when `closeCents` crosses `targetPriceCents`, then marks the alert as triggered.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | `ObjectId` | ref: `User` |
| `assetId` | `ObjectId` | ref: `Asset` |
| `condition` | `'above' \| 'below'` | Fire when price rises above or falls below the target |
| `targetPriceCents` | `number` | Threshold in cents |
| `isTriggered` | `boolean` | Set to `true` once the alert fires |
| `triggeredAt` | `Date` | Timestamp when the alert was triggered |

**Indexes:**
- `{ userId, isTriggered }` — fetch active alerts per user
- `{ assetId, isTriggered }` — fetch active alerts per asset (used by Change Stream handler)
