# nestjs-dividend-portfolio

A NestJS REST API for tracking high-yield ETF and fund portfolios, logging trades, and projecting dividend yields — backed by MongoDB.

---

## Features

- **Portfolio tracking** — manage user positions and cash balances
- **Trade ledger** — immutable buy/sell records with multi-document ACID transactions
- **Dividend history** — MongoDB Time Series collections for efficient historical payout queries
- **Price ticks** — OHLCV time series data per asset
- **Price alerts** — threshold-based alerts designed for Change Stream + WebSocket integration
- **Production-first config** — environment variables validated on startup; no `.env` in production

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | v22 |
| npm | v10+ |
| MongoDB | v6+ |

---

## Key Dependencies

| Package | Version |
|---------|---------|
| `@nestjs/common` | ^11.0.1 |
| `@nestjs/core` | ^11.0.1 |
| `@nestjs/config` | ^4.0.3 |
| `@nestjs/mongoose` | ^11.0.4 |
| `mongoose` | ^9.3.0 |
| `joi` | ^18.0.2 |
| `typescript` | ^5.7.3 |

---

## Domain Model

Seven business domains, each with its own schema and module:

| Domain | Collection | Type | Description |
|--------|------------|------|-------------|
| `users` | `users` | Standard | User accounts and cash balances |
| `assets` | `assets` | Standard | ETF/fund metadata |
| `portfolios` | `portfolios` | Standard | User holdings (one position per user per asset) |
| `trades` | `trades` | Standard | Immutable buy/sell ledger |
| `price-ticks` | `price_ticks` | Time Series | OHLCV price data per asset |
| `dividends` | `dividends` | Time Series | Historical dividend payouts per asset |
| `alerts` | `alerts` | Standard | Price threshold alerts |

All monetary values are stored in **cents** (integers) to avoid floating-point precision issues.

See `docs/domain-model.md` for the full field reference.

---

## Project Setup

```bash
npm install
```

---

## Configuration

The app uses a **production-first** config strategy:

- In **production** (`NODE_ENV=production`), env vars are read directly from the environment — no `.env` file is loaded.
- In **development/test**, a `.env` file is loaded from the project root.
- All required variables are validated with Joi on startup. The app **refuses to start** if any required variable is missing.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `PORT` | No | `3000` | HTTP port |
| `MONGO_URI` | Yes | — | Full MongoDB connection URI |
| `MONGO_DB_NAME` | Yes | — | MongoDB database name |

### Local Development

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=nestjs_dividend_portfolio
```

### Production

Set environment variables on the host or in your container platform. Do **not** use a `.env` file in production.

```bash
export NODE_ENV=production
export PORT=3000
export MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net
export MONGO_DB_NAME=nestjs_dividend_portfolio
```

---

## Running the App

```bash
# development (watch mode)
npm run start:dev

# production
npm run build
npm run start:prod
```

---

## Docker

Each environment has its own Dockerfile and docker-compose file.

| Environment | Dockerfile | docker-compose |
|-------------|------------|----------------|
| Localhost | `Dockerfile.localhost` | `docker-compose.localhost.yml` |
| Development | `Dockerfile.dev` | `docker-compose.dev.yml` |
| Production | `Dockerfile.prod` | `docker-compose.prod.yml` |

### Localhost

Spins up the app and a MongoDB container together. `src/` is mounted as a volume for hot reload.

```bash
docker compose -f docker-compose.localhost.yml up --build
```

### Development

Code is baked into the image at build time. Expects an external MongoDB via `.env`.

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Production

Multi-stage build — compiled output only, no dev deps, runs as non-root. All vars from host environment.

```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net \
MONGO_DB_NAME=nestjs_dividend_portfolio \
docker compose -f docker-compose.prod.yml up --build
```

---

## Running Tests

```bash
# unit tests
npm run test

# test coverage
npm run test:cov

# e2e tests
npm run test:e2e
```

---

## Documentation

| File | Description |
|------|-------------|
| `docs/api-reference.md` | REST endpoint reference for all 7 domains |
| `docs/user-flows.md` | End-to-end business and user flows |
| `docs/domain-model.md` | Full field reference for all 7 business domains |
| `docs/how-to-add-schema.md` | Guide to adding a new domain schema and module |
| `docs/how-to-add-api.md` | Guide to adding a service and controller to a domain |
| `how-to-mongodb.md` | General Mongoose usage patterns in this project |
