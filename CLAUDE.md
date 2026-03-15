# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Run in watch mode (local development)
npm run start:dev

# Build
npm run build

# Run production build
npm run start:prod

# Type-check without emitting
npx tsc --noEmit

# Lint and auto-fix
npm run lint

# Unit tests
npm run test

# Single test file
npx jest src/path/to/file.spec.ts

# Test coverage
npm run test:cov

# e2e tests
npm run test:e2e
```

## Architecture

### Config layer (`src/config/`)

Production-first: when `NODE_ENV=production`, no `.env` file is loaded — environment variables must be set on the host. In all other environments, `.env` is read from the project root.

All env vars are validated by Joi at startup in `config.module.ts`. The app refuses to start if required vars are missing.

- `config.module.ts` — `@Global()` module; registers `@nestjs/config` with Joi validation schema and loads named config factories via the `load: []` array. Import this once in `AppModule`.
- `config.service.ts` — the only place other services should read config. Exposes typed getters (`config.mongo`, `config.port`, etc.). Never read `process.env` directly outside of config factories.
- `mongo.config.ts` — config factory registered as the `mongo` namespace via `registerAs('mongo', ...)`. Maps raw env vars to a typed object.

To add a new config group: create `src/config/<name>.config.ts` using `registerAs`, add Joi rules to `config.module.ts`, register the factory in `load: []`, and add a typed getter to `config.service.ts`.

### Database layer (`src/database/`)

`DatabaseModule` uses `MongooseModule.forRootAsync` to establish the Mongoose connection, injecting `ConfigService` to get `mongo.uri` and `mongo.dbName`. Register it once in `AppModule` — the connection is shared app-wide.

Feature modules access MongoDB by importing `MongooseModule.forFeature([{ name: MyModel.name, schema: MySchema }])` in their own module and injecting the model with `@InjectModel(MyModel.name)`.

### Module registration order in `AppModule`

`ConfigModule` must come before `DatabaseModule` (and all other modules) since it is a global provider that others depend on at startup.

### Business domain modules (`src/<domain>/`)

Seven feature domains, each structured with clean architecture layers:

```
src/<domain>/
  domain/          — entities, repository interfaces
  application/     — service (use cases)
  infrastructure/  — Mongoose schema, repository implementation, listeners
  presentation/    — controller, DTOs, WebSocket gateway
  <domain>s.module.ts
```

All monetary values are stored in cents (integers) to avoid floating-point precision issues. See `docs/domain-model.md` for full field references and `docs/api-reference.md` for all REST endpoints.

| Module | Collection | Notes |
|--------|------------|-------|
| `UsersModule` | `users` | Cash balance in cents |
| `AssetsModule` | `assets` | ETF/fund metadata; ticker is unique uppercase |
| `PortfoliosModule` | `portfolios` | One position per user per asset (compound unique index); no create/update endpoints — managed via trades |
| `TradesModule` | `trades` | Immutable ledger — insert only via `POST /trades/buy` or `POST /trades/sell`, always inside a transaction |
| `PriceTicksModule` | `price_ticks` | Time Series (timeField: `timestamp`, metaField: `metadata`) |
| `DividendsModule` | `dividends` | Time Series (timeField: `exDate`, metaField: `metadata`) |
| `AlertsModule` | `alerts` | Price threshold triggers for Change Streams + WebSocket |

**Time Series collections** (`price_ticks`, `dividends`) — their modules implement `OnModuleInit` and call `db.createCollection()` with `timeseries` options on startup if the collection does not yet exist. Never drop and recreate these collections without migrating the data.

**Trades + transactions** — every trade write must use a multi-document transaction: `buy` deducts `User.cashBalanceCents` and upserts `Portfolio.shares` (recalculating weighted average cost basis); `sell` does the reverse. Trade documents are never updated after insertion. `TradesModule` imports `UsersModule` and `PortfoliosModule` to access their models within the transaction.

**Alerts + EventEmitter** — `PriceTicksService` emits a `price_tick.inserted` event (via `EventEmitter2`) after every successful insert. `AlertChangeStreamListener` subscribes with `@OnEvent('price_tick.inserted')`, checks active alerts for the asset, and fires a `alert.triggered` event when `closeCents` crosses `targetPriceCents`. `AlertsGateway` broadcasts the WebSocket notification. After firing, `Alert.isTriggered` is set to `true` and `triggeredAt` is recorded.

> **Why not a MongoDB Change Stream on `price_ticks`?** Time series collections are backed by internal `system.buckets.*` bucket collections — MongoDB forbids `.watch()` directly on them (error 166 `CommandNotSupportedOnView`). Watching the database and filtering by `ns.coll: 'price_ticks'` also fails because the events surface under `ns.coll: 'system.buckets.price_ticks'` with bucket-level (not document-level) payloads. The application-level event approach is simpler and avoids all of these constraints.

## Docs

| File | Description |
|------|-------------|
| `docs/api-reference.md` | REST endpoint reference for all 7 domains |
| `docs/user-flows.md` | End-to-end business and user flows |
| `docs/domain-model.md` | Full field reference for all 7 business domains |
| `docs/how-to-add-schema.md` | Guide to adding a new domain schema and module |
| `docs/how-to-add-api.md` | Guide to adding a service and controller to a domain |
| `docs/how-to-mongodb.md` | General Mongoose usage patterns in this project |
| `docs/clean-architecture-migration.md` | Migration log — flat NestJS structure to clean architecture |
| `docs/lesson-learned.md` | Operational lessons (ADB, Time Series, transactions, replica sets) |
| `docs/mongo/time-series-and-system-buckets.md` | Deep dive: Time Series collections and system.buckets constraints |
| `docs/mongo/multi-document-transactions.md` | Deep dive: ACID transactions and replica set requirements |
| `docs/plans/logger-implementation-v1.md` | Implementation plan for nestjs-pino structured logging |
| `docs/test-result/` | OCI ADB integration test results (per run) |
| `docs/worklogs/` | Daily work logs |

## Docker

Three separate Dockerfiles, one per environment:

| Environment | Dockerfile | docker-compose |
|-------------|------------|----------------|
| Localhost | `Dockerfile.localhost` | `docker-compose.localhost.yml` |
| Development | `Dockerfile.dev` | `docker-compose.dev.yml` |
| Production | `Dockerfile.prod` | `docker-compose.prod.yml` |

- **Localhost** — mounts `src/` as a volume for hot reload; includes a MongoDB container.
- **Dev** — bakes `src/` into the image at build time; expects external MongoDB via `.env`.
- **Prod** — multi-stage build, prunes dev deps, runs as non-root; no `.env` file, all vars from host environment.
