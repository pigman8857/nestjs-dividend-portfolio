import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// MongoDB Time Series collection.
// Must be created with timeseries options — see price-ticks.module.ts onModuleInit.
// timeField: 'timestamp' | metaField: 'metadata' | granularity: 'hours'
@Schema({ collection: 'price_ticks' })
export class PriceTick {
  // timeField — required by MongoDB time series
  @Prop({ required: true })
  timestamp: Date;

  // metaField — groups series by asset ticker
  @Prop({ required: true, type: { ticker: String, assetId: String } })
  metadata: {
    ticker: string;
    assetId: string;
  };

  // OHLCV in cents
  @Prop({ required: true })
  openCents: number;

  @Prop({ required: true })
  highCents: number;

  @Prop({ required: true })
  lowCents: number;

  @Prop({ required: true })
  closeCents: number;

  @Prop({ default: 0 })
  volume: number;
}

export type PriceTickDocument = HydratedDocument<PriceTick>;
export const PriceTickSchema = SchemaFactory.createForClass(PriceTick);
