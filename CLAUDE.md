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

Seven feature domains, each with a `<domain>.schema.ts` and `<domain>s.module.ts`. All monetary values are stored in cents (integers) to avoid floating-point precision issues. See `docs/domain-model.md` for full field references.

| Module | Collection | Notes |
|--------|------------|-------|
| `UsersModule` | `users` | Cash balance in cents |
| `AssetsModule` | `assets` | ETF/fund metadata; ticker is unique uppercase |
| `PortfoliosModule` | `portfolios` | One position per user per asset (compound unique index) |
| `TradesModule` | `trades` | Immutable ledger — insert only, always inside a transaction |
| `PriceTicksModule` | `price_ticks` | Time Series (timeField: `timestamp`, metaField: `metadata`) |
| `DividendsModule` | `dividends` | Time Series (timeField: `exDate`, metaField: `metadata`) |
| `AlertsModule` | `alerts` | Price threshold triggers for Change Streams + WebSocket |

**Time Series collections** (`price_ticks`, `dividends`) — their modules implement `OnModuleInit` and call `db.createCollection()` with `timeseries` options on startup if the collection does not yet exist. Never drop and recreate these collections without migrating the data.

**Trades + transactions** — every trade write must use a multi-document transaction: `buy` deducts `User.cashBalanceCents` and upserts `Portfolio.shares`; `sell` does the reverse. Trade documents are never updated after insertion.

**Alerts + Change Streams** — a Change Stream on `price_ticks` watches `closeCents` and fires WebSocket notifications when it crosses an alert's `targetPriceCents`. After firing, `Alert.isTriggered` is set to `true` and `triggeredAt` is recorded.

## Docs

Project documentation lives in `docs/`:

- `docs/domain-model.md` — full field-level reference for all 7 business domains
- `docs/how-to-add-schema.md` — step-by-step guide to adding a new domain module
- `how-to-mongodb.md` — general Mongoose usage patterns in this project

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
