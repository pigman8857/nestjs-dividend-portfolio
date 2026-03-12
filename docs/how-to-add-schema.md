# How to Define a New Schema for a New Domain

## Steps

**1. Create the schema file**

```ts
// src/orders/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Order {
  @Prop({ required: true })
  item: string;

  @Prop({ default: 0 })
  quantity: number;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);
```

**2. Create the module**

```ts
// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.schema';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }])],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
```

**3. Create the service**

```ts
// src/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}
}
```

**4. Register in AppModule**

```ts
// src/app.module.ts
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [ConfigModule, DatabaseModule, OrdersModule],
})
export class AppModule {}
```

---

## Folder Convention

```
src/orders/
  order.schema.ts
  orders.module.ts
  orders.service.ts
  orders.controller.ts
```
