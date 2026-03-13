import { Module, OnModuleInit, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(PriceTicksModule.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    const db = this.connection.db!;
    const collections = await db.listCollections({ name: 'price_ticks' }).toArray();
    if (collections.length === 0) {
      try {
        await db.createCollection('price_ticks', {
          timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'hours',
          },
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
}

