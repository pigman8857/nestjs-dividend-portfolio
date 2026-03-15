# nestjs-dividend-portfolio (MongoOracle)

A NestJS REST API for tracking high-yield ETF and fund portfolios, logging trades, and projecting dividend yields — backed by MongoDB or **Oracle ADB MongoDB-compatible API**.

**nestjs-dividend-portfolio** is the application. **MongoOracle** is the project name used to test Oracle ADB MongoDB compatibility with this stack.

---

## Features

- **Portfolio tracking** — manage user positions and cash balances
- **Trade ledger** — immutable buy/sell records with multi-document ACID transactions
- **Dividend history** — MongoDB Time Series collections for efficient historical payout queries
- **Price ticks** — OHLCV time series data per asset
- **Price alerts** — threshold-based alerts triggered via application events (`EventEmitter2`) and broadcast over WebSocket
- **Production-first config** — environment variables validated on startup; no `.env` in production

---

## Requirements (as of 2026-03-13)

| Tool | Version |
|------|---------|
| Node.js | v22 |
| npm | v10+ |
| MongoDB | v6+ |

---

## Key Dependencies (as of 2026-03-13)

| Package | Version |
|---------|---------|
| `@nestjs/common` | 11.1.16 |
| `@nestjs/core` | 11.1.16 |
| `@nestjs/config` | 4.0.3 |
| `@nestjs/mongoose` | 11.0.4 |
| `mongoose` | 9.3.0 |
| `joi` | 18.0.2 |
| `reflect-metadata` | 0.2.2 |
| `rxjs` | 7.8.2 |
| `typescript` | 5.9.3 |

---

## Domain Model

Seven business domains, each structured with clean architecture layers (`domain/`, `application/`, `infrastructure/`, `presentation/`):

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
MONGO_URI=mongodb://localhost:27017/?replicaSet=rs0&directConnection=true
MONGO_DB_NAME=nestjs_dividend_portfolio
```

> **Note:** `replicaSet=rs0` and `directConnection=true` are required when running MongoDB via `docker-compose.localhost.yml`. The localhost setup runs MongoDB as a single-node replica set (needed for multi-document transactions). `directConnection=true` bypasses replica set topology discovery so the driver connects directly to `localhost` instead of the internal container hostname.

### Oracle ADB (MongoDB-compatible API)

Infra provisioning is managed by a separate Terraform repo: [nestjs-dividend-portfolio-infra](https://github.com/pigman8857/nestjs-dividend-portfolio-infra)

After `terraform apply` completes, get the connection string:

```bash
terraform output -raw mongo_uri_full
```

Then set in `.env`:

```env
MONGO_URI=mongodb://<user>:<password>@<tenancy-prefix>-<adb-name>.adb.<region>.oraclecloudapps.com:27017/mongoapp?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true
MONGO_DB_NAME=mongoapp
```

> `MONGO_DB_NAME` must equal the Oracle schema username (`mongoapp`). Using any other database name will result in a `listCollections not authorized` error.
>
> Required connection params for ADB: `retryWrites=false`, `loadBalanced=true`, `authMechanism=PLAIN`, `authSource=$external`, `ssl=true`.

See [issue-fix-summary-01.md](https://github.com/pigman8857/nestjs-dividend-portfolio-infra/blob/main/docs/issue-fix-summaries/issue-fix-summary-01.md) and [issue-fix-summary-02.md](https://github.com/pigman8857/nestjs-dividend-portfolio-infra/blob/main/docs/issue-fix-summaries/issue-fix-summary-02.md) for provisioning issues found and fixed during initial setup.

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

## OCI ADB Compatibility

This app has been integration-tested against Oracle ADB MongoDB-compatible API (`ap-singapore-1`). All features confirmed working:

- Standard CRUD, indexed queries, compound unique indexes
- Multi-document ACID transactions
- Time Series collection writes and range queries
- Application-level event-driven alert triggering (EventEmitter2)

**Test environment:**
- **App:** running on local dev machine (Thailand)
- **Database:** Oracle ADB Always Free tier, hosted in `ap-singapore-1`

**Performance baseline (local dev → OCI Singapore):**

| Operation | Avg latency | Notes |
|-----------|-------------|-------|
| Reads / simple writes | ~37–40ms | ~1 RTT; NestJS/Mongoose overhead is <7ms |
| ACID transactions (buy/sell) | ~180–225ms | 5–6 sequential TLS round-trips |

Transaction latency is structural — `retryWrites=false` + `loadBalanced=true` requires sequential round-trips per transaction step. Both the cross-region network hop and the Always Free tier's single-OCPU limit contribute to this baseline. Collocating the app in OCI `ap-singapore-1` would reduce the RTT component to ~1–2ms.

See [`docs/test-result/`](docs/test-result/) for full test reports.

---

## Documentation

| File | Description |
|------|-------------|
| [`docs/api-reference.md`](docs/api-reference.md) | REST endpoint reference for all 7 domains |
| [`docs/user-flows.md`](docs/user-flows.md) | End-to-end business and user flows |
| [`docs/domain-model.md`](docs/domain-model.md) | Full field reference for all 7 business domains |
| [`docs/how-to-add-schema.md`](docs/how-to-add-schema.md) | Guide to adding a new domain schema and module |
| [`docs/how-to-add-api.md`](docs/how-to-add-api.md) | Guide to adding a service and controller to a domain |
| [`docs/how-to-mongodb.md`](docs/how-to-mongodb.md) | General Mongoose usage patterns in this project |
| [`docs/clean-architecture-migration.md`](docs/clean-architecture-migration.md) | Notes on the clean architecture migration |
| [`docs/lesson-learned.md`](docs/lesson-learned.md) | Operational lessons and gotchas (ADB, Time Series, transactions) |
| [`docs/mongo/time-series-and-system-buckets.md`](docs/mongo/time-series-and-system-buckets.md) | MongoDB Time Series collections and system.buckets internals |
| [`docs/mongo/multi-document-transactions.md`](docs/mongo/multi-document-transactions.md) | MongoDB multi-document transaction patterns |
| [`docs/plans/logger-implementation-v1.md`](docs/plans/logger-implementation-v1.md) | Implementation plan for nestjs-pino structured logging |
| [`docs/test-result/`](docs/test-result/) | OCI ADB integration test results (per run) |
| [`docs/worklogs/`](docs/worklogs/) | Daily work logs |
