import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PriceTick, PriceTickSchema } from './price-tick.schema';
import { MongoosePriceTickRepository } from './infrastructure/price-tick.repository.impl';
import { PRICE_TICK_REPOSITORY } from './domain/price-tick.repository';
import { PriceTicksService } from './application/price-ticks.service';
import { PriceTicksController } from './presentation/price-ticks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PriceTick.name, schema: PriceTickSchema }]),
  ],
  providers: [
    { provide: PRICE_TICK_REPOSITORY, useClass: MongoosePriceTickRepository },
    PriceTicksService,
  ],
  controllers: [PriceTicksController],
  exports: [PRICE_TICK_REPOSITORY, PriceTicksService],
})
export class PriceTicksModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  // Time Series collections must be created with options before any insert.
  // This is a no-op if the collection already exists.
  async onModuleInit() {
    const db = this.connection.db!;
    const collections = await db.listCollections({ name: 'price_ticks' }).toArray();
    if (collections.length === 0) {
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

