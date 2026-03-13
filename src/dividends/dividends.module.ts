import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Dividend, DividendSchema } from './dividend.schema';
import { MongooseDividendRepository } from './infrastructure/dividend.repository.impl';
import { DIVIDEND_REPOSITORY } from './domain/dividend.repository';
import { DividendsService } from './application/dividends.service';
import { DividendsController } from './presentation/dividends.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Dividend.name, schema: DividendSchema },
    ]),
  ],
  providers: [
    { provide: DIVIDEND_REPOSITORY, useClass: MongooseDividendRepository },
    DividendsService,
  ],
  controllers: [DividendsController],
  exports: [DIVIDEND_REPOSITORY, DividendsService],
})
export class DividendsModule implements OnModuleInit {
  private readonly logger = new Logger(DividendsModule.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    const db = this.connection.db!;
    const collections = await db.listCollections({ name: 'dividends' }).toArray();
    if (collections.length === 0) {
      try {
        await db.createCollection('dividends', {
          timeseries: {
            timeField: 'exDate',
            metaField: 'metadata',
            granularity: 'hours',
          },
        });
        this.logger.log('[ADB-TEST] Time Series collection "dividends" created — ADB supports timeseries ✓');
      } catch (err: any) {
        this.logger.error(
          { error: err.message, code: err.code },
          '[ADB-TEST] FAILED to create Time Series collection "dividends" — ADB may not support timeseries ✗',
        );
        throw err;
      }
    } else {
      this.logger.log('[ADB-TEST] Time Series collection "dividends" already exists, skipping creation');
    }
  }
}
