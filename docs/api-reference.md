# API Reference

All endpoints are prefixed by the base URL (default: `http://localhost:3000`).

Monetary values are in **cents** throughout (e.g. $1.50 → `150`).

---

## Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get user by ID |
| `POST` | `/users` | Create a user |
| `PATCH` | `/users/:id` | Update a user |
| `DELETE` | `/users/:id` | Delete a user |

### POST /users

```json
{
  "email": "alice@example.com",
  "name": "Alice",
  "cashBalanceCents": 100000
}
```

---

## Assets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/assets` | List all assets |
| `GET` | `/assets?ticker=VTI` | Find asset by ticker (case-insensitive) |
| `GET` | `/assets/:id` | Get asset by ID |
| `POST` | `/assets` | Create an asset |
| `PATCH` | `/assets/:id` | Update an asset |
| `DELETE` | `/assets/:id` | Delete an asset |

### POST /assets

```json
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

`type` must be `"ETF"` or `"FUND"`. `dividendFrequency` must be `"monthly"`, `"quarterly"`, or `"annual"`. Ticker is stored as uppercase.

---

## Portfolios

Positions are managed automatically by the trades endpoints. Direct creation and update are intentionally not exposed.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/portfolios` | List all positions |
| `GET` | `/portfolios?userId=<id>` | List positions for a user |
| `GET` | `/portfolios/:id` | Get position by ID |
| `DELETE` | `/portfolios/:id` | Delete a position |

---

## Trades

Trades are **immutable** — use `POST /trades/buy` or `POST /trades/sell` to create them. Both endpoints run inside a multi-document ACID transaction that updates the user's cash balance and portfolio position atomically.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/trades` | List all trades |
| `GET` | `/trades?userId=<id>` | List trades for a user |
| `GET` | `/trades?assetId=<id>` | List trades for an asset |
| `GET` | `/trades/:id` | Get trade by ID |
| `POST` | `/trades/buy` | Execute a buy (transactional) |
| `POST` | `/trades/sell` | Execute a sell (transactional) |

### POST /trades/buy

Deducts `shares × pricePerShareCents` from `User.cashBalanceCents`. Upserts the portfolio position with a recalculated weighted average cost basis. Returns `400` if cash balance is insufficient.

```json
{
  "userId": "<ObjectId>",
  "assetId": "<ObjectId>",
  "shares": 10,
  "pricePerShareCents": 24500
}
```

### POST /trades/sell

Reduces portfolio `shares`. Adds proceeds to `User.cashBalanceCents`. Returns `400` if the user holds fewer shares than requested.

```json
{
  "userId": "<ObjectId>",
  "assetId": "<ObjectId>",
  "shares": 5,
  "pricePerShareCents": 25000
}
```

---

## Price Ticks

MongoDB Time Series collection (`price_ticks`). Querying requires a `ticker` query parameter.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/price-ticks?ticker=VTI` | Get price history for a ticker |
| `GET` | `/price-ticks?ticker=VTI&from=2024-01-01&to=2024-12-31` | Filter by date range |
| `POST` | `/price-ticks` | Insert a price tick |

### POST /price-ticks

```json
{
  "timestamp": "2024-06-01T16:00:00.000Z",
  "metadata": {
    "ticker": "VTI",
    "assetId": "<ObjectId>"
  },
  "openCents": 24100,
  "highCents": 24600,
  "lowCents": 24050,
  "closeCents": 24500,
  "volume": 3200000
}
```

---

## Dividends

MongoDB Time Series collection (`dividends`). Query by `ticker` or `assetId`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dividends?ticker=VTI` | Get dividend history by ticker |
| `GET` | `/dividends?assetId=<id>` | Get dividend history by asset ID |
| `POST` | `/dividends` | Insert a dividend record |

### POST /dividends

```json
{
  "exDate": "2024-06-20T00:00:00.000Z",
  "metadata": {
    "ticker": "VTI",
    "assetId": "<ObjectId>"
  },
  "amountPerShareCents": 85,
  "paymentDate": "2024-06-28T00:00:00.000Z",
  "frequency": "quarterly"
}
```

`frequency` must be `"monthly"`, `"quarterly"`, or `"annual"`.

---

## Alerts

Price threshold alerts. Intended to be evaluated by a Change Stream watching `price_ticks.closeCents`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/alerts` | List all alerts |
| `GET` | `/alerts?userId=<id>` | List alerts for a user |
| `GET` | `/alerts/:id` | Get alert by ID |
| `POST` | `/alerts` | Create an alert |
| `PATCH` | `/alerts/:id` | Update an alert |
| `DELETE` | `/alerts/:id` | Delete an alert |

### POST /alerts

```json
{
  "userId": "<ObjectId>",
  "assetId": "<ObjectId>",
  "condition": "above",
  "targetPriceCents": 25000
}
```

`condition` must be `"above"` or `"below"`. Once triggered, `isTriggered` is set to `true` and `triggeredAt` is recorded.
