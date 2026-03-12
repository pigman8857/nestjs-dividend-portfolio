import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Portfolio, PortfolioSchema } from './portfolio.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Portfolio.name, schema: PortfolioSchema }])],
  exports: [MongooseModule],
})
export class PortfoliosModule {}
