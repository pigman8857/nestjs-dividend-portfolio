# How to Work with MongoDB

This guide covers how to define schemas, register models, and query MongoDB in this project using `@nestjs/mongoose`.

---

## 1. Define a Schema

```ts
// src/cats/cat.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Cat {
  @Prop({ required: true })
  name: string;

  @Prop()
  age: number;
}

export type CatDocument = HydratedDocument<Cat>;
export const CatSchema = SchemaFactory.createForClass(Cat);
```

---

## 2. Register the Schema in a Feature Module

```ts
// src/cats/cats.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cat, CatSchema } from './cat.schema';
import { CatsService } from './cats.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }])],
  providers: [CatsService],
})
export class CatsModule {}
```

---

## 3. Inject the Model and Query

```ts
// src/cats/cats.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cat, CatDocument } from './cat.schema';

@Injectable()
export class CatsService {
  constructor(
    @InjectModel(Cat.name) private readonly catModel: Model<CatDocument>,
  ) {}

  findAll() {
    return this.catModel.find().exec();
  }

  findOne(id: string) {
    return this.catModel.findById(id).exec();
  }

  create(data: Partial<Cat>) {
    return this.catModel.create(data);
  }

  update(id: string, data: Partial<Cat>) {
    return this.catModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  delete(id: string) {
    return this.catModel.findByIdAndDelete(id).exec();
  }
}
```

---

## 4. Register the Feature Module in AppModule

```ts
@Module({
  imports: [ConfigModule, DatabaseModule, CatsModule],
})
export class AppModule {}
```

---

## Common Schema Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Schema()` | Marks a class as a Mongoose schema |
| `@Prop()` | Defines a field |
| `@Prop({ required: true })` | Required field |
| `@Prop({ default: 0 })` | Field with default |
| `@Prop({ type: [String] })` | Array field |
| `@Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cat' })` | Reference to another collection |

---

## Relationships (ref)

```ts
import mongoose from 'mongoose';

@Schema()
export class Order {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cat', required: true })
  cat: Cat;
}
```

Then populate when querying:

```ts
this.orderModel.findById(id).populate('cat').exec();
```

---

## Time Series Collections

Time Series collections require special creation options (`timeseries`, `timeField`, `metaField`) that must be set at creation time and cannot be changed after the fact. Mongoose's `autoCreate` would create a plain collection before the module can apply these options, so it must be disabled.

### Schema

```ts
// src/price-ticks/price-tick.schema.ts
@Schema({ collection: 'price_ticks', autoCreate: false, timestamps: false })
export class PriceTick {
  @Prop({ required: true }) timestamp: Date;
  @Prop({ type: Object, required: true }) metadata: { ticker: string; assetId: string };
  @Prop({ required: true }) closeCents: number;
  // ...other OHLCV fields
}
export type PriceTickDocument = HydratedDocument<PriceTick>;
export const PriceTickSchema = SchemaFactory.createForClass(PriceTick);
```

**`autoCreate: false` is required.** Without it, Mongoose creates the collection as a plain collection before `onModuleInit` runs, and the subsequent `createCollection()` with `timeseries` options fails with "collection already exists".

### Module — create collection on startup

```ts
// src/price-ticks/price-ticks.module.ts
@Module({ ... })
export class PriceTicksModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    const db = this.connection.db!;
    const existing = await db.listCollections({ name: 'price_ticks' }).toArray();
    if (existing.length === 0) {
      await db.createCollection('price_ticks', {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'hours',
        },
      });
    }
  }
}
```

The `listCollections` guard makes this a no-op on every startup after the first.

---

## Change Streams

### Standard collections

```ts
const changeStream = db.collection('trades').watch([], { fullDocument: 'updateLookup' });
changeStream.on('change', (change) => { ... });
```

### Time Series collections — do NOT watch directly

**MongoDB does not support Change Streams on time series collections.** Calling `.watch()` on one throws error 166 `CommandNotSupportedOnView` at runtime (time series collections are views over internal `system.buckets.*` collections).

Watching the database and filtering by `ns.coll: 'price_ticks'` also fails — the events surface under `ns.coll: 'system.buckets.price_ticks'` with bucket-level payloads, not individual document payloads.

**The correct pattern: emit an application-level event from the service after insert.**

```ts
// price-ticks.service.ts — emit after every insert
@Injectable()
export class PriceTicksService {
  constructor(
    @Inject(PRICE_TICK_REPOSITORY) private readonly repo: IPriceTickRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(data: Omit<PriceTickEntity, 'id'>): Promise<PriceTickEntity[]> {
    const ticks = await this.repo.create(data);
    for (const tick of ticks) {
      this.eventEmitter.emit('price_tick.inserted', tick);
    }
    return ticks;
  }
}
```

```ts
// alert-change-stream.listener.ts — subscribe with @OnEvent
@Injectable()
export class AlertChangeStreamListener {
  @OnEvent('price_tick.inserted')
  async handlePriceTickInserted(tick: PriceTickEntity): Promise<void> {
    // check alerts and fire WebSocket notifications
  }
}
```

`EventEmitterModule.forRoot()` must be registered in `AppModule` for `EventEmitter2` to be injectable globally.
