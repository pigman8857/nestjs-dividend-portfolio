import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Trade, TradeSchema } from './infrastructure/trade.schema';
import { MongooseTradeRepository } from './infrastructure/trade.repository.impl';
import { TRADE_REPOSITORY } from './domain/trade.repository';
import { UsersModule } from '../users/users.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { ExecuteBuyUseCase } from './application/execute-buy.use-case';
import { ExecuteSellUseCase } from './application/execute-sell.use-case';
import { GetTradesService } from './application/get-trades.service';
import { TradesController } from './presentation/trades.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trade.name, schema: TradeSchema }]),
    UsersModule,
    PortfoliosModule,
  ],
  providers: [
    { provide: TRADE_REPOSITORY, useClass: MongooseTradeRepository },
    ExecuteBuyUseCase,
    ExecuteSellUseCase,
    GetTradesService,
  ],
  controllers: [TradesController],
})
export class TradesModule {}
