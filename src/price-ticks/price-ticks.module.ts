import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PriceTick, PriceTickSchema } from './price-tick.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PriceTick.name, schema: PriceTickSchema }]),
  ],
  exports: [MongooseModule],
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

