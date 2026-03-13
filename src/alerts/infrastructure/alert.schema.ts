import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AlertCondition } from '../domain/alert.entity';

// A Change Stream on the price_ticks collection watches for documents where
// closeCents crosses the targetPriceCents threshold, then triggers a WebSocket
// notification and marks this alert as triggered.
@Schema({ timestamps: true })
export class Alert {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true })
  assetId: Types.ObjectId;

  // 'above': fire when price rises above target
  // 'below': fire when price falls below target
  @Prop({ required: true, enum: ['above', 'below'] })
  condition: AlertCondition;

  // Target price in cents
  @Prop({ required: true })
  targetPriceCents: number;

  @Prop({ default: false })
  isTriggered: boolean;

  @Prop()
  triggeredAt: Date;
}

export type AlertDocument = HydratedDocument<Alert>;
export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ userId: 1, isTriggered: 1 });
AlertSchema.index({ assetId: 1, isTriggered: 1 });
