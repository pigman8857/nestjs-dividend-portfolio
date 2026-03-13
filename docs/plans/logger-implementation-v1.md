# Logger Implementation Plan — ADB-MongoDB Compatibility Testing

## Purpose

This project deploys MongoDB on **Oracle Cloud Infrastructure Autonomous Database (ADB)** and tests whether it behaves like standard MongoDB. The logger exists specifically to answer three questions:

1. **Does ADB support this MongoDB feature?** — log every MongoDB operation with a clear success/failure label so failures are immediately visible.
2. **How fast is ADB-MongoDB?** — log duration (ms) on every MongoDB operation to compare performance against baseline.
3. **What exactly failed?** — when ADB rejects an operation, capture the full error with enough context to diagnose which feature is unsupported.

> **Log Summary Example:** See [log-summary-example-v1.md](log-summary-example-v1.md) for full example log output from a real test run, feature result tables (pass/fail), performance baseline, and grep commands to extract ADB-TEST results from production logs.

---

## MongoDB Features Under Test in This Project

| Feature | Where Used | What Could Fail on ADB |
|---------|-----------|------------------------|
| Basic connection | `DatabaseModule` | TLS negotiation, auth, URI format |
| Standard CRUD | All 7 repositories | Any basic read/write incompatibility |
| Time Series collection creation | `PriceTicksModule.onModuleInit`, `DividendsModule.onModuleInit` | ADB may not support `timeseries` collection options |
| Time Series inserts | `MongoosePriceTickRepository.create`, `MongooseDividendRepository.create` | Bucket-level insert behaviour may differ |
| Time Series queries with date range | `MongoosePriceTickRepository.findByTicker` | Range filters on `timeField` may not be optimised or supported |
| Multi-document transactions | `ExecuteBuyUseCase`, `ExecuteSellUseCase` | ADB may not support `startSession()` or `withTransaction()` |
| Upserts | `MongoosePortfolioRepository` | `findOneAndUpdate` with `upsert: true` |
| Compound unique index enforcement | `portfolios` collection | ADB index behavior |
| Change Streams (already known unsupported) | N/A — using EventEmitter workaround | Already documented in CLAUDE.md |

---

## Logging Strategy

Log at **two levels**:

### Level 1 — Semantic / Feature-level Logs (manual, in application/module code)
Written by us. Each MongoDB feature gets a clear `[ADB-TEST]` log entry showing:
- What feature is being exercised
- Whether it succeeded or failed
- Duration in ms for performance comparison

### Level 2 — Query-level Logs (automatic, via Mongoose plugin)
A Mongoose connection plugin attached in `DatabaseModule.connectionFactory` intercepts every query, insert, and update on every collection. Logs collection name, operation type, and duration at `debug` level. High volume — only visible when `LOG_LEVEL=debug`.

### Log Level Guidance

| Level | When to use |
|-------|-------------|
| `error` | MongoDB operation threw — ADB likely does not support this feature |
| `warn` | Expected business errors (domain errors, not MongoDB errors) |
| `info` | Feature-level confirmations: connection established, timeseries created, transaction committed |
| `debug` | Every individual query/insert with timing (high volume) |

---

## Library: `nestjs-pino`

Same rationale as before — fast, JSON-first, HTTP request logging built in, replaces NestJS built-in logger globally.

**Packages to install:**
```bash
npm install nestjs-pino pino-http
npm install --save-dev pino-pretty
```

---

## Files to Create or Modify

### New files

| File | Purpose |
|------|---------|
| `src/common/logger/logger.module.ts` | `LoggerModule` wrapping `nestjs-pino`, configured from `ConfigService` |
| `src/common/logger/mongoose-query.plugin.ts` | Mongoose schema plugin — adds pre/post hooks to time and log every query |

### Modified files

| File | Change |
|------|--------|
| `package.json` | Add `nestjs-pino`, `pino-http`; add `pino-pretty` to devDependencies |
| `src/config/config.module.ts` | Add Joi rule for `LOG_LEVEL` (default `'info'`) |
| `src/config/config.service.ts` | Add `get logLevel()` typed getter |
| `src/app.module.ts` | Import `LoggerModule` |
| `src/main.ts` | `bufferLogs: true` + `app.useLogger(app.get(Logger))` |
| `src/database/database.module.ts` | Add `connectionFactory` to attach connection event listeners and the Mongoose query plugin |
| `src/price-ticks/price-ticks.module.ts` | Log timeseries collection creation attempt/result in `onModuleInit` |
| `src/dividends/dividends.module.ts` | Log timeseries collection creation attempt/result in `onModuleInit` |
| `src/trades/application/execute-buy.use-case.ts` | Log transaction start, commit, abort with duration |
| `src/trades/application/execute-sell.use-case.ts` | Same as buy |
| `src/price-ticks/application/price-ticks.service.ts` | Log time series insert with duration |
| `src/dividends/application/dividends.service.ts` | Log time series insert with duration |
| `src/common/filters/domain-exception.filter.ts` | Add `Logger` and log domain errors at `warn` |
| `src/alerts/infrastructure/alert-change-stream.listener.ts` | Replace `new Logger(...)` with injected `Logger` |

---

## Implementation Steps

### Step 1 — Install dependencies

```bash
npm install nestjs-pino pino-http
npm install --save-dev pino-pretty
```

---

### Step 2 — Add `LOG_LEVEL` to config

**`src/config/config.module.ts`** — add to Joi schema:
```typescript
LOG_LEVEL: Joi.string()
  .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
  .default('info'),
```

**`src/config/config.service.ts`** — add getter:
```typescript
get logLevel(): string {
  return this.configService.get<string>('LOG_LEVEL', 'info');
}
```

---

### Step 3 — Create `LoggerModule`

**`src/common/logger/logger.module.ts`**:
```typescript
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '../../config/config.service';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          transport:
            process.env.NODE_ENV !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
  ],
})
export class LoggerModule {}
```

---

### Step 4 — Create Mongoose query timing plugin

**`src/common/logger/mongoose-query.plugin.ts`**:

This plugin is registered globally via `connectionFactory`. It attaches pre/post hooks to every Mongoose schema to measure and log every MongoDB round-trip.

```typescript
import { Schema } from 'mongoose';
import { Logger } from '@nestjs/common';

const logger = new Logger('MongooseQuery');

const QUERY_OPS = [
  'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
  'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'countDocuments',
] as const;

export function mongooseQueryPlugin(schema: Schema): void {
  schema.pre(QUERY_OPS, function () {
    (this as any)._startMs = Date.now();
  });

  schema.post(QUERY_OPS, function () {
    const durationMs = Date.now() - (this as any)._startMs;
    logger.debug({
      collection: (this as any).mongooseCollection?.name ?? 'unknown',
      op: (this as any).op,
      durationMs,
    }, 'mongo:query');
  });

  schema.pre('save', function () {
    (this as any)._startMs = Date.now();
  });

  schema.post('save', function () {
    const durationMs = Date.now() - (this as any)._startMs;
    logger.debug({
      collection: (this as any).collection?.name ?? 'unknown',
      op: 'save',
      durationMs,
    }, 'mongo:insert');
  });
}
```

> **Note on timeseries inserts:** `model.create([data])` on a time series collection uses Mongoose's `insertMany` path, not `save`. This may not be captured by the `save` hook. Add a separate `insertMany` hook if timeseries insert timing is critical. This can be tuned during implementation.

---

### Step 5 — Update `DatabaseModule` — connection events + plugin

**`src/database/database.module.ts`**:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { mongooseQueryPlugin } from '../common/logger/mongoose-query.plugin';

const logger = new Logger('MongooseConnection');

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.mongo.uri,
        dbName: config.mongo.dbName,
      }),
      connectionFactory: (connection) => {
        // ADB connection lifecycle
        connection.on('connected', () =>
          logger.log({ event: 'connected' }, '[ADB-TEST] MongoDB connected to Oracle ADB'),
        );
        connection.on('error', (err: Error) =>
          logger.error({ event: 'error', error: err.message }, '[ADB-TEST] MongoDB ADB connection error'),
        );
        connection.on('disconnected', () =>
          logger.warn({ event: 'disconnected' }, '[ADB-TEST] MongoDB ADB disconnected'),
        );
        connection.on('reconnected', () =>
          logger.log({ event: 'reconnected' }, '[ADB-TEST] MongoDB ADB reconnected'),
        );

        // Register query timing plugin on all schemas
        connection.plugin(mongooseQueryPlugin);

        return connection;
      },
    }),
  ],
})
export class DatabaseModule {}
```

---

### Step 6 — Log Time Series collection creation

**`src/price-ticks/price-ticks.module.ts`** — update `onModuleInit`:

```typescript
private readonly logger = new Logger(PriceTicksModule.name);

async onModuleInit() {
  const db = this.connection.db!;
  const collections = await db.listCollections({ name: 'price_ticks' }).toArray();
  if (collections.length === 0) {
    try {
      await db.createCollection('price_ticks', {
        timeseries: { timeField: 'timestamp', metaField: 'metadata', granularity: 'hours' },
      });
      this.logger.log('[ADB-TEST] Time Series collection "price_ticks" created — ADB supports timeseries ✓');
    } catch (err: any) {
      this.logger.error(
        { error: err.message, code: err.code },
        '[ADB-TEST] FAILED to create Time Series collection "price_ticks" — ADB may not support timeseries ✗',
      );
      throw err;
    }
  } else {
    this.logger.log('[ADB-TEST] Time Series collection "price_ticks" already exists, skipping creation');
  }
}
```

Apply the same pattern to **`src/dividends/dividends.module.ts`** for the `dividends` collection.

---

### Step 7 — Log transaction lifecycle in trades use cases

**`src/trades/application/execute-buy.use-case.ts`** (same pattern for sell):

```typescript
private readonly logger = new Logger(ExecuteBuyUseCase.name);

async execute(dto: ExecuteTradeDto): Promise<TradeEntity> {
  const session = await this.connection.startSession();
  const startMs = Date.now();
  this.logger.debug({ userId: dto.userId, assetId: dto.assetId }, '[ADB-TEST] Starting transaction (buy)');
  try {
    let result: TradeEntity | undefined;
    await session.withTransaction(async () => {
      // ... existing logic unchanged ...
    });
    const durationMs = Date.now() - startMs;
    this.logger.log(
      { userId: dto.userId, assetId: dto.assetId, shares: dto.shares, totalAmountCents, durationMs },
      '[ADB-TEST] Transaction committed (buy) — ADB supports multi-doc transactions ✓',
    );
    return result!;
  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    this.logger.error(
      { userId: dto.userId, error: err.message, durationMs },
      '[ADB-TEST] Transaction aborted (buy) ✗',
    );
    throw err;
  } finally {
    await session.endSession();
  }
}
```

> The error log does **not** distinguish between a domain error (e.g. `InsufficientFundsError`) and a MongoDB transaction error. Both will be caught here. The `error.message` in the log will make the cause clear. Consider filtering: if `err instanceof DomainError`, log at `warn` (expected), otherwise log at `error` (potential ADB failure).

---

### Step 8 — Log Time Series inserts with duration

**`src/price-ticks/application/price-ticks.service.ts`**:

```typescript
private readonly logger = new Logger(PriceTicksService.name);

async create(data: Omit<PriceTickEntity, 'id'>): Promise<PriceTickEntity[]> {
  const startMs = Date.now();
  try {
    const ticks = await this.repo.create(data);
    const durationMs = Date.now() - startMs;
    this.logger.debug(
      { ticker: data.metadata.ticker, timestamp: data.timestamp, durationMs },
      '[ADB-TEST] Time Series insert (price_ticks) succeeded ✓',
    );
    for (const tick of ticks) {
      this.eventEmitter.emit('price_tick.inserted', tick);
    }
    return ticks;
  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    this.logger.error(
      { ticker: data.metadata.ticker, error: err.message, durationMs },
      '[ADB-TEST] Time Series insert (price_ticks) FAILED ✗',
    );
    throw err;
  }
}
```

Apply the same pattern to **`src/dividends/application/dividends.service.ts`** for dividend inserts.

---

### Step 9 — Update `DomainExceptionFilter`

`DomainExceptionFilter` is currently instantiated with `new DomainExceptionFilter()` in `main.ts`, which prevents DI injection. Change to DI registration:

**`src/app.module.ts`** — add as a provider:
```typescript
providers: [AppService, DomainExceptionFilter],
```

**`src/main.ts`** — use DI instance:
```typescript
app.useGlobalFilters(app.get(DomainExceptionFilter));
```

**`src/common/filters/domain-exception.filter.ts`** — add logger:
```typescript
@Injectable()
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainError, host: ArgumentsHost): void {
    // existing status logic ...
    this.logger.warn({ error: exception.name, message: exception.message, status }, 'Domain error');
    response.status(status).json({ error: exception.name, message: exception.message });
  }
}
```

---

### Step 10 — Update `AlertChangeStreamListener`

Replace `new Logger(...)` with injected `Logger` and add success log:

```typescript
constructor(
  private readonly logger: Logger,
  private readonly alertsService: AlertsService,
  private readonly eventEmitter: EventEmitter2,
) {}

// In handlePriceTickInserted, after triggering:
this.logger.log(
  { alertId: alert.id, userId: alert.userId, assetId, closeCents },
  'Alert triggered',
);
```

---

### Step 11 — Import `LoggerModule` in `AppModule` and wire up `main.ts`

**`src/app.module.ts`**:
```typescript
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,    // ← second, after ConfigModule
    DatabaseModule,
    ...
  ],
  providers: [AppService, DomainExceptionFilter],  // ← add filter here
})
```

**`src/main.ts`**:
```typescript
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(app.get(DomainExceptionFilter));  // ← DI instance
  const config = app.get(ConfigService);
  await app.listen(config.port);
}
```

---

## Log Output Examples

**Startup — Time Series collection creation:**
```
INFO  [ADB-TEST] MongoDB connected to Oracle ADB
INFO  [ADB-TEST] Time Series collection "price_ticks" created — ADB supports timeseries ✓
INFO  [ADB-TEST] Time Series collection "dividends" created — ADB supports timeseries ✓
```

**Startup — ADB does NOT support timeseries (failure scenario):**
```
ERROR [ADB-TEST] FAILED to create Time Series collection "price_ticks" — ADB may not support timeseries ✗
      error: "CommandNotSupported: timeseries option is not supported"
      code: 115
```

**Trade (transaction committed):**
```
DEBUG [ADB-TEST] Starting transaction (buy) {"userId":"u1","assetId":"a1"}
INFO  [ADB-TEST] Transaction committed (buy) — ADB supports multi-doc transactions ✓ {"durationMs":34}
```

**Trade (transaction failed — ADB doesn't support sessions):**
```
ERROR [ADB-TEST] Transaction aborted (buy) ✗ {"error":"Transaction numbers are only allowed on a replica set member or mongos","durationMs":12}
```

**Debug mode — individual query timing:**
```
DEBUG [MongooseQuery] mongo:query {"collection":"users","op":"findOne","durationMs":8}
DEBUG [MongooseQuery] mongo:query {"collection":"portfolios","op":"findOneAndUpdate","durationMs":11}
DEBUG [PriceTicksService] [ADB-TEST] Time Series insert (price_ticks) succeeded ✓ {"ticker":"AAPL","durationMs":15}
```

---

## Environment Variables

```
LOG_LEVEL=info   # debug for full query timing; info for feature-level only; default: info
```

Use `LOG_LEVEL=debug` when actively testing a feature to see every query round-trip time.
Use `LOG_LEVEL=info` for normal observation.

---

## File Change Summary

```
src/
├── common/
│   ├── filters/
│   │   └── domain-exception.filter.ts    MODIFIED — @Injectable, add Logger
│   └── logger/
│       ├── logger.module.ts              NEW — nestjs-pino setup
│       └── mongoose-query.plugin.ts      NEW — global query timing hooks
├── config/
│   ├── config.module.ts                  MODIFIED — LOG_LEVEL Joi rule
│   └── config.service.ts                 MODIFIED — logLevel getter
├── database/
│   └── database.module.ts                MODIFIED — connectionFactory: events + plugin
├── app.module.ts                         MODIFIED — import LoggerModule, add DomainExceptionFilter provider
├── main.ts                               MODIFIED — bufferLogs, useLogger, app.get(DomainExceptionFilter)
├── price-ticks/
│   ├── price-ticks.module.ts             MODIFIED — log timeseries create in onModuleInit
│   └── application/
│       └── price-ticks.service.ts        MODIFIED — log timeseries insert with duration
├── dividends/
│   ├── dividends.module.ts               MODIFIED — log timeseries create in onModuleInit
│   └── application/
│       └── dividends.service.ts          MODIFIED — log timeseries insert with duration
├── trades/
│   └── application/
│       ├── execute-buy.use-case.ts       MODIFIED — log transaction lifecycle
│       └── execute-sell.use-case.ts      MODIFIED — log transaction lifecycle
└── alerts/
    └── infrastructure/
        └── alert-change-stream.listener.ts   MODIFIED — inject Logger
```

Total: **2 new files, 13 modified files.**
