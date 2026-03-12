# User Flows

This document describes the end-to-end business flows for the portfolio tracker. All monetary values are in **cents**.

---

## 1. Onboarding a User

Before a user can trade, they need an account with a funded cash balance.

```
POST /users
{
  "email": "alice@example.com",
  "name": "Alice",
  "cashBalanceCents": 500000   // $5,000.00 starting balance
}
```

Returns the created user document including its `_id`, which is required for all subsequent trade and alert operations.

---

## 2. Adding an Asset

Assets (ETFs or funds) must exist before they can be traded or tracked.

```
POST /assets
{
  "ticker": "VTI",
  "name": "Vanguard Total Stock Market ETF",
  "type": "ETF",
  "sector": "Broad Market",
  "expenseRatio": 0.0003,
  "dividendFrequency": "quarterly",
  "currentPriceCents": 24500
}
```

Returns the asset document including its `_id`. Ticker is stored as uppercase and must be unique.

---

## 3. Buying an Asset

`POST /trades/buy` runs a multi-document ACID transaction:

1. Checks `User.cashBalanceCents >= shares × pricePerShareCents` — returns `400` if not.
2. Deducts `totalAmountCents` from `User.cashBalanceCents`.
3. Upserts the `Portfolio` position:
   - **New position** — creates with `shares` and `averageCostBasisCents = pricePerShareCents`.
   - **Existing position** — adds shares and recalculates weighted average cost basis.
4. Inserts an immutable `Trade` document with `type: "buy"`.

```
POST /trades/buy
{
  "userId": "<user _id>",
  "assetId": "<asset _id>",
  "shares": 10,
  "pricePerShareCents": 24500   // $245.00 per share → $2,450.00 total
}
```

After this call:
- `User.cashBalanceCents` decreases by `245000`
- `Portfolio.shares` increases by `10`
- A new `Trade` record is written

---

## 4. Selling an Asset

`POST /trades/sell` runs a multi-document ACID transaction:

1. Checks the user holds `>= shares` in their portfolio — returns `400` if not.
2. Reduces `Portfolio.shares` by the sold amount.
3. Adds `totalAmountCents` to `User.cashBalanceCents`.
4. Inserts an immutable `Trade` document with `type: "sell"`.

```
POST /trades/sell
{
  "userId": "<user _id>",
  "assetId": "<asset _id>",
  "shares": 5,
  "pricePerShareCents": 25000   // $250.00 per share → $1,250.00 total
}
```

After this call:
- `User.cashBalanceCents` increases by `125000`
- `Portfolio.shares` decreases by `5`
- A new `Trade` record is written

---

## 5. Viewing a Portfolio

Query all positions for a user to see their current holdings.

```
GET /portfolios?userId=<user _id>
```

Each position includes:
- `assetId` — which asset is held
- `shares` — current number of shares (supports fractional)
- `averageCostBasisCents` — volume-weighted average purchase price per share

To see the full trade history for a user:

```
GET /trades?userId=<user _id>
```

---

## 6. Recording Price Ticks

Price ticks feed the time series collection and drive alert evaluation. Typically ingested by a data pipeline rather than end users.

```
POST /price-ticks
{
  "timestamp": "2024-06-01T16:00:00.000Z",
  "metadata": { "ticker": "VTI", "assetId": "<asset _id>" },
  "openCents": 24100,
  "highCents": 24600,
  "lowCents": 24050,
  "closeCents": 24500,
  "volume": 3200000
}
```

Query historical prices:

```
GET /price-ticks?ticker=VTI&from=2024-01-01&to=2024-12-31
```

---

## 7. Recording Dividends

Dividend records track payouts per asset over time.

```
POST /dividends
{
  "exDate": "2024-06-20T00:00:00.000Z",
  "metadata": { "ticker": "VTI", "assetId": "<asset _id>" },
  "amountPerShareCents": 85,
  "paymentDate": "2024-06-28T00:00:00.000Z",
  "frequency": "quarterly"
}
```

To project income, fetch dividend history and multiply `amountPerShareCents` by the user's `Portfolio.shares` for that asset.

```
GET /dividends?ticker=VTI
```

---

## 8. Setting a Price Alert

A user can set a threshold alert on any asset.

```
POST /alerts
{
  "userId": "<user _id>",
  "assetId": "<asset _id>",
  "condition": "above",
  "targetPriceCents": 25000
}
```

`condition` options:
- `"above"` — fire when `closeCents > targetPriceCents`
- `"below"` — fire when `closeCents < targetPriceCents`

A Change Stream on `price_ticks` evaluates each new tick against all active alerts for that asset. When triggered:
- A WebSocket notification is sent to the user.
- `Alert.isTriggered` is set to `true` and `Alert.triggeredAt` is recorded.

Query active alerts for a user:

```
GET /alerts?userId=<user _id>
```

---

## Flow Summary

```
Create User → Fund Balance
     ↓
Create Asset
     ↓
POST /trades/buy  →  Portfolio position created/updated
     ↓                User cash balance reduced
     ↓
POST /price-ticks  →  Change Stream evaluates alerts
     ↓                WebSocket fires if threshold crossed
     ↓
POST /trades/sell  →  Portfolio position reduced
                      User cash balance increased
```
