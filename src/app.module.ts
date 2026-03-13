import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './common/logger/logger.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AssetsModule } from './assets/assets.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { TradesModule } from './trades/trades.module';
import { PriceTicksModule } from './price-ticks/price-ticks.module';
import { DividendsModule } from './dividends/dividends.module';
import { AlertsModule } from './alerts/alerts.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    EventEmitterModule.forRoot(),
    UsersModule,
    AssetsModule,
    PortfoliosModule,
    TradesModule,
    PriceTicksModule,
    DividendsModule,
    AlertsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DomainExceptionFilter],
})
export class AppModule {}
