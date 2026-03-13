# How to Define a New Schema for a New Domain

This project uses clean architecture. Each domain is split into four layers. The example below uses `orders` — apply the same pattern to any domain.

---

## Folder Structure

```
src/orders/
  domain/
    order.entity.ts          — plain entity class (no Mongoose)
    order.repository.ts      — repository interface + injection token
  infrastructure/
    order.schema.ts          — Mongoose schema
    order.repository.impl.ts — Mongoose implementation of the interface
  application/
    orders.service.ts        — use cases; depends on the interface, not Mongoose
  presentation/
    orders.controller.ts     — HTTP layer
    dto/
      create-order.dto.ts
      update-order.dto.ts
  orders.module.ts
```

---

## Step-by-step

### 1. Domain entity

```ts
// src/orders/domain/order.entity.ts
export class OrderEntity {
  constructor(
    public readonly id: string,
    public readonly item: string,
    public readonly quantity: number,
    public readonly createdAt?: Date,
  ) {}
}
```

### 2. Repository interface

```ts
// src/orders/domain/order.repository.ts
import { OrderEntity } from './order.entity';

export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export interface IOrderRepository {
  findAll(): Promise<OrderEntity[]>;
  findById(id: string): Promise<OrderEntity | null>;
  create(data: Pick<OrderEntity, 'item' | 'quantity'>): Promise<OrderEntity>;
  update(id: string, data: Partial<Pick<OrderEntity, 'item' | 'quantity'>>): Promise<OrderEntity | null>;
  delete(id: string): Promise<boolean>;
}
```

### 3. Mongoose schema

```ts
// src/orders/infrastructure/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true }) item: string;
  @Prop({ default: 0 }) quantity: number;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);
```

### 4. Repository implementation

```ts
// src/orders/infrastructure/order.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';
import { IOrderRepository } from '../domain/order.repository';
import { OrderEntity } from '../domain/order.entity';

@Injectable()
export class MongooseOrderRepository implements IOrderRepository {
  constructor(
    @InjectModel(Order.name) private readonly model: Model<OrderDocument>,
  ) {}

  async findAll(): Promise<OrderEntity[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async create(data: Pick<OrderEntity, 'item' | 'quantity'>): Promise<OrderEntity> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject());
  }

  async update(id: string, data: Partial<Pick<OrderEntity, 'item' | 'quantity'>>): Promise<OrderEntity | null> {
    const doc = await this.model.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  private toEntity(doc: Record<string, any>): OrderEntity {
    return new OrderEntity(doc._id.toString(), doc.item, doc.quantity, doc.createdAt);
  }
}
```

### 5. Module

```ts
// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './infrastructure/order.schema';
import { MongooseOrderRepository } from './infrastructure/order.repository.impl';
import { ORDER_REPOSITORY } from './domain/order.repository';
import { OrdersService } from './application/orders.service';
import { OrdersController } from './presentation/orders.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }])],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: MongooseOrderRepository },
    OrdersService,
  ],
  controllers: [OrdersController],
  exports: [ORDER_REPOSITORY, OrdersService],
})
export class OrdersModule {}
```

### 6. Register in AppModule

```ts
// src/app.module.ts
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [ConfigModule, DatabaseModule, /* ... */ OrdersModule],
})
export class AppModule {}
```
