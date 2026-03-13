# Clean Architecture Migration

**Date:** 2026-03-13

---

## Context

The original codebase had a flat NestJS structure — each domain module contained a schema, service, and controller, all tightly coupled in the same folder. Services directly injected Mongoose models, controllers accepted raw `Partial<Schema>` bodies with no validation, and business logic (trades WACB calculation, transaction coordination) was buried inside services alongside database queries.

The goal was to introduce a pragmatic clean architecture: clear layer separation, repository abstraction, DTO validation, and domain logic moved into testable entity classes — without over-engineering into full Domain-Driven Design.

---

## Architecture Layers

Each of the 7 domain modules was restructured into four layers:

```
src/<domain>/
  domain/
    <name>.entity.ts          # Plain TypeScript class — no Mongoose dependency
    <name>.repository.ts      # Interface + injection token constant
  infrastructure/
    <name>.schema.ts          # Mongoose schema (unchanged content)
    <name>.repository.impl.ts # MongooseXRepository implements the interface
  application/
    <name>s.service.ts        # Use cases — depends only on IRepository interface
  presentation/
    dto/
      create-<name>.dto.ts    # class-validator decorated request bodies
      update-<name>.dto.ts
    <name>s.controller.ts     # Maps DTOs → use case → response
  <name>s.module.ts           # Wires repository token, service, controller
```

---

## What Changed

### Foundation (`src/common/`, `src/main.ts`)

| File | Purpose |
|---|---|
| `src/common/errors/domain.errors.ts` | Domain error hierarchy: `DomainError`, `InsufficientFundsError`, `InsufficientSharesError`, `EntityNotFoundError` |
| `src/common/filters/domain-exception.filter.ts` | Global exception filter — maps domain errors to HTTP status codes (404, 422) |
| `src/main.ts` | Added global `ValidationPipe` (whitelist, transform) and `DomainExceptionFilter` |

### Domain Entity Logic

Two entities carry meaningful domain logic — the rest are plain data carriers:

**`src/users/domain/user.entity.ts`**
- `canAfford(amountCents)` — returns `true` if `cashBalanceCents >= amountCents`

**`src/portfolios/domain/portfolio.entity.ts`**
- `addShares(newShares, pricePerShareCents)` — recalculates volume-weighted average cost basis (WACB) on buy. Formula was previously embedded in `TradesService`.
- `removeShares(shares)` — reduces shares or throws `InsufficientSharesError`

**`src/alerts/domain/alert.entity.ts`**
- `isBreached(closeCents)` — checks if a price tick crosses the threshold based on condition (`above`/`below`)
- `trigger()` — marks the alert as triggered with a timestamp

### Trades Module Restructured (most complex)

The old `TradesService` mixed HTTP concerns, domain logic, and multi-document transactions. It was split into:

| File | Responsibility |
|---|---|
| `application/execute-buy.use-case.ts` | Transaction: validate funds → deduct cash → upsert portfolio → insert trade |
| `application/execute-sell.use-case.ts` | Transaction: validate shares → reduce portfolio → credit cash → insert trade |
| `application/get-trades.service.ts` | Read queries only (no session needed) |

Cross-module access: `TradesModule` imports `UsersModule` and `PortfoliosModule` for their repository tokens (not raw Mongoose models).

### Alerts — Change Stream + WebSocket Implemented

| File | Responsibility |
|---|---|
| `infrastructure/alert-change-stream.listener.ts` | `OnModuleInit` — watches `price_ticks` Change Stream; evaluates active alerts per asset; emits `alert.triggered` event via EventEmitter2 |
| `presentation/alerts.gateway.ts` | `@WebSocketGateway` — subscribes to `alert.triggered` event; pushes to all connected Socket.IO clients |

`EventEmitterModule.forRoot()` registered in `AppModule`.

### DTO Validation

All request bodies replaced with `class-validator` DTO classes:

| Module | DTOs |
|---|---|
| Users | `CreateUserDto`, `UpdateUserDto` |
| Assets | `CreateAssetDto`, `UpdateAssetDto` |
| Trades | `ExecuteTradeDto` (shared for buy/sell) |
| Price Ticks | `CreatePriceTickDto` (with `@ValidateNested` metadata) |
| Dividends | `CreateDividendDto` (with `@ValidateNested` metadata) |
| Alerts | `CreateAlertDto`, `UpdateAlertDto` |

---

## Implementation Plan (Phases)

### Phase 1 — Foundation
- Install `class-validator`, `class-transformer`
- Create domain error hierarchy
- Create `DomainExceptionFilter`
- Update `main.ts` with global pipe and filter

### Phase 2 — Simple Modules (template established with users, replicated to others)
1. `users` — template for repository token pattern
2. `assets`
3. `portfolios` (read-only; no create/update DTOs)
4. `price-ticks` (time series; `OnModuleInit` stays in module class)
5. `dividends` (time series; same as price-ticks)

### Phase 3 — Domain Entities with Logic
- Extract WACB formula from `TradesService` → `PortfolioEntity.addShares()`
- Add `UserEntity.canAfford()`, `AlertEntity.isBreached()` / `trigger()`

### Phase 4 — Trades Module
- Create `ITradeRepository` with session-aware `insert()`
- Add session-aware methods to `IUserRepository` (`deductBalance`, `creditBalance`) and `IPortfolioRepository` (`findByUserAndAsset`, `createPosition`, `updatePosition`)
- Create `ExecuteBuyUseCase`, `ExecuteSellUseCase`, `GetTradesService`
- Update `TradesModule` to import repository tokens from `UsersModule` and `PortfoliosModule`

### Phase 5 — Alerts (Change Stream + WebSocket)
- Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `@nestjs/event-emitter`
- Create `AlertChangeStreamListener` (infrastructure)
- Create `AlertsGateway` (presentation)
- Register `EventEmitterModule.forRoot()` in `AppModule`

### Phase 6 — Unit Tests
- `PortfolioEntity` — 5 tests covering WACB formula and share removal
- `ExecuteBuyUseCase` — 4 tests: happy path (new position), happy path (existing position with WACB), insufficient funds, user not found
- `ExecuteSellUseCase` — 3 tests: happy path, insufficient shares, position not found

**Result: 13 tests, 0 failures, 0 type errors**

---

## New Dependencies Added

| Package | Purpose |
|---|---|
| `class-validator` | DTO field validation decorators |
| `class-transformer` | Type transformation (`@Type(() => Date)` for query params) |
| `@nestjs/websockets` | WebSocket gateway support |
| `@nestjs/platform-socket.io` | Socket.IO adapter for NestJS |
| `socket.io` | WebSocket transport |
| `@nestjs/event-emitter` | In-process event bus between Change Stream listener and WebSocket gateway |

---

## Verification Steps

1. Start MongoDB replica set: `docker compose -f docker-compose.localhost.yml up mongo -d`
2. Start app: `npm run start:dev`
3. Run `api.http` buy/sell flows — confirm ACID transactions still work
4. Run unit tests: `npx jest src/trades src/portfolios/domain`
5. Send invalid body to `POST /trades/buy` (missing field) → expect `400`
6. Buy with insufficient cash → expect `422` with `InsufficientFundsError`
7. Connect a Socket.IO client and insert a price tick that crosses an alert threshold — expect `alert.triggered` WebSocket event

---

## Tradeoffs Made

| Decision | Choice | Reason |
|---|---|---|
| Session threading | Passed explicitly to repository methods | Simpler than UoW pattern; explicit is clearer in Mongoose |
| Domain entity fields | Public mutable fields | Reduces boilerplate; immutability enforced at DTO/HTTP boundary |
| Repository location | Inside each module's `domain/` folder | Module boundary already provides isolation; separate `ports/` package is overkill |
| CQRS | Use case per write, service for reads | Full CQRS not justified; read side is trivial |
| Response mappers | Controller returns entity directly | No dedicated mapper until API shape diverges from entity shape |
