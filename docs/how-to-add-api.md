# How to Add an API Controller to a Domain

This guide covers the full pattern for exposing a domain via REST API in the clean architecture layout. The example uses `orders` — apply the same pattern to any domain.

For creating the schema, entity, and repository first, see `docs/how-to-add-schema.md`.

---

## 1. DTOs

```ts
// src/orders/presentation/dto/create-order.dto.ts
import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  item: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
```

```ts
// src/orders/presentation/dto/update-order.dto.ts
import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  item?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
```

---

## 2. Service

The service depends on the **repository interface** (injected via token), not the Mongoose model directly.

```ts
// src/orders/application/orders.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { IOrderRepository, ORDER_REPOSITORY } from '../domain/order.repository';
import { OrderEntity } from '../domain/order.entity';
import { EntityNotFoundError } from '../../common/errors/domain.errors';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
  ) {}

  findAll(): Promise<OrderEntity[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<OrderEntity> {
    const order = await this.repo.findById(id);
    if (!order) throw new EntityNotFoundError('Order', id);
    return order;
  }

  create(data: Pick<OrderEntity, 'item' | 'quantity'>): Promise<OrderEntity> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<Pick<OrderEntity, 'item' | 'quantity'>>): Promise<OrderEntity> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new EntityNotFoundError('Order', id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new EntityNotFoundError('Order', id);
  }
}
```

---

## 3. Controller

```ts
// src/orders/presentation/orders.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { OrdersService } from '../application/orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateOrderDto) {
    return this.ordersService.create({ item: body.item, quantity: body.quantity ?? 0 });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateOrderDto) {
    return this.ordersService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.ordersService.delete(id);
  }
}
```

---

## 4. Routes

| Method | URL | Action |
|--------|-----|--------|
| `GET` | `/orders` | List all |
| `GET` | `/orders/:id` | Get one by ID |
| `POST` | `/orders` | Create |
| `PATCH` | `/orders/:id` | Update |
| `DELETE` | `/orders/:id` | Delete |

---

## 5. Error handling

`EntityNotFoundError` (and other `DomainError` subclasses) are caught by `DomainExceptionFilter` registered globally in `main.ts`:

- `EntityNotFoundError` → 404
- `InsufficientFundsError` / `InsufficientSharesError` → 422
- Other `DomainError` → 400

Throw these from the service layer; the filter handles the HTTP response.

---

## Note on Trades

`TradesModule` is the exception — its service executes writes inside a **multi-document transaction** (`session.startTransaction()`), updating three collections atomically. See `docs/domain-model.md` for the transaction requirements.
