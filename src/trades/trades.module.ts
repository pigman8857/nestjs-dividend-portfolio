import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Trade, TradeSchema } from './trade.schema';
import { UsersModule } from '../users/users.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { TradesService } from './trades.service';
import { TradesController } from './trades.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trade.name, schema: TradeSchema }]),
    UsersModule,
    PortfoliosModule,
  ],
  providers: [TradesService],
  controllers: [TradesController],
  exports: [MongooseModule],
})
export class TradesModule {}
