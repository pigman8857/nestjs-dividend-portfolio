import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TradeType = 'buy' | 'sell';

// Each trade document is immutable once written — never updated, only inserted.
// Buy/sell must be executed inside a multi-document transaction:
//   buy:  deduct cashBalanceCents from User, upsert Portfolio shares
//   sell: add cashBalanceCents to User, reduce Portfolio shares
@Schema({ timestamps: true })
export class Trade {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true })
  assetId: Types.ObjectId;

  @Prop({ required: true, enum: ['buy', 'sell'] })
  type: TradeType;

  @Prop({ required: true })
  shares: number;

  // Price at execution time in cents per share
  @Prop({ required: true })
  pricePerShareCents: number;

  // Total value of the trade in cents (shares * pricePerShareCents)
  @Prop({ required: true })
  totalAmountCents: number;

  @Prop({ required: true })
  executedAt: Date;
}

export type TradeDocument = HydratedDocument<Trade>;
export const TradeSchema = SchemaFactory.createForClass(Trade);

TradeSchema.index({ userId: 1, executedAt: -1 });
TradeSchema.index({ assetId: 1, executedAt: -1 });
