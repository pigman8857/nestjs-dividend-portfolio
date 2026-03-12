import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Trade, TradeSchema } from './trade.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Trade.name, schema: TradeSchema }])],
  exports: [MongooseModule],
})
export class TradesModule {}
