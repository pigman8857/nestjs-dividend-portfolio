import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AssetType, DividendFrequency } from '../domain/asset.entity';

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true, unique: true, uppercase: true })
  ticker: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['ETF', 'FUND'] })
  type: AssetType;

  @Prop()
  sector: string;

  // Annual expense ratio as a decimal (e.g. 0.0035 = 0.35%)
  @Prop({ default: 0 })
  expenseRatio: number;

  @Prop({ required: true, enum: ['monthly', 'quarterly', 'annual'] })
  dividendFrequency: DividendFrequency;

  // Latest known price in cents
  @Prop({ default: 0 })
  currentPriceCents: number;
}

export type AssetDocument = HydratedDocument<Asset>;
export const AssetSchema = SchemaFactory.createForClass(Asset);
