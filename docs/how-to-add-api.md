# How to Add an API Controller to a Domain

This guide covers the full pattern for exposing a domain schema via REST API using a service and controller.

The example uses `assets` — apply the same pattern to any domain.

---

## 1. Create a Service

```ts
// src/assets/assets.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './asset.schema';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
  ) {}

  findAll() {
    return this.assetModel.find().exec();
  }

  findOne(id: string) {
    return this.assetModel.findById(id).exec();
  }

  create(data: Partial<Asset>) {
    return this.assetModel.create(data);
  }

  update(id: string, data: Partial<Asset>) {
    return this.assetModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  delete(id: string) {
    return this.assetModel.findByIdAndDelete(id).exec();
  }
}
```

---

## 2. Create a Controller

```ts
// src/assets/assets.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Asset } from './asset.schema';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  create(@Body() body: Partial<Asset>) {
    return this.assetsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Asset>) {
    return this.assetsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }
}
```

---

## 3. Register in the Module

```ts
// src/assets/assets.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from './asset.schema';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }])],
  providers: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
```

---

## Routes

| Method | URL | Action |
|--------|-----|--------|
| `GET` | `/assets` | List all |
| `GET` | `/assets/:id` | Get one by ID |
| `POST` | `/assets` | Create |
| `PATCH` | `/assets/:id` | Update |
| `DELETE` | `/assets/:id` | Delete |

---

## Folder Convention Per Domain

```
src/assets/
  asset.schema.ts
  assets.module.ts
  assets.service.ts
  assets.controller.ts
```

---

## Note on Trades

The `trades` domain is the exception — its service must execute writes inside a **multi-document transaction** rather than a plain `create()` call. See `docs/domain-model.md` for the transaction requirements.
