import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Portfolio {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true })
  assetId: Types.ObjectId;

  // Number of shares held (supports fractional shares)
  @Prop({ required: true, default: 0 })
  shares: number;

  // Volume-weighted average cost basis in cents per share
  @Prop({ required: true, default: 0 })
  averageCostBasisCents: number;
}

export type PortfolioDocument = HydratedDocument<Portfolio>;
export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);

// Enforce one position per user per asset
PortfolioSchema.index({ userId: 1, assetId: 1 }, { unique: true });
