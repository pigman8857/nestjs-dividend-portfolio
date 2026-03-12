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
