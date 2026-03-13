import { Module, OnModuleInit } from '@nestjs/common';
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
  constructor(@InjectConnection() private readonly connection: Connection) {}

  // Time Series collections must be created with options before any insert.
  // This is a no-op if the collection already exists.
  async onModuleInit() {
    const db = this.connection.db!;
    const collections = await db
      .listCollections({ name: 'dividends' })
      .toArray();
    if (collections.length === 0) {
      await db.createCollection('dividends', {
        timeseries: {
          timeField: 'exDate',
          metaField: 'metadata',
          granularity: 'hours',
        },
      });
    }
  }
}
