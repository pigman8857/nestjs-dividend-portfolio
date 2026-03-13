import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Portfolio, PortfolioSchema } from './infrastructure/portfolio.schema';
import { MongoosePortfolioRepository } from './infrastructure/portfolio.repository.impl';
import { PORTFOLIO_REPOSITORY } from './domain/portfolio.repository';
import { PortfoliosService } from './application/portfolios.service';
import { PortfoliosController } from './presentation/portfolios.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Portfolio.name, schema: PortfolioSchema }])],
  providers: [
    { provide: PORTFOLIO_REPOSITORY, useClass: MongoosePortfolioRepository },
    PortfoliosService,
  ],
  controllers: [PortfoliosController],
  exports: [PORTFOLIO_REPOSITORY, PortfoliosService],
})
export class PortfoliosModule {}
