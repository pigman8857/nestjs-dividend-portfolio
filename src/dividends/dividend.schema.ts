import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// MongoDB Time Series collection.
// Must be created with timeseries options — see dividends.module.ts onModuleInit.
// timeField: 'exDate' | metaField: 'metadata' | granularity: 'hours'
@Schema({ collection: 'dividends', autoCreate: false })
export class Dividend {
  // timeField — the ex-dividend date (shares must be held before this date to qualify)
  @Prop({ required: true })
  exDate: Date;

  // metaField
  @Prop({ required: true, type: { ticker: String, assetId: String } })
  metadata: {
    ticker: string;
    assetId: string;
  };

  // Dividend amount per share in cents
  @Prop({ required: true })
  amountPerShareCents: number;

  // Actual payment date (when cash hits the account)
  @Prop({ required: true })
  paymentDate: Date;

  @Prop({ required: true, enum: ['monthly', 'quarterly', 'annual'] })
  frequency: string;
}

export type DividendDocument = HydratedDocument<Dividend>;
export const DividendSchema = SchemaFactory.createForClass(Dividend);
