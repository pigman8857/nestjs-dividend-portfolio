import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ExecuteBuyUseCase } from '../application/execute-buy.use-case';
import { ExecuteSellUseCase } from '../application/execute-sell.use-case';
import { GetTradesService } from '../application/get-trades.service';
import { ExecuteTradeDto } from './dto/execute-trade.dto';

@Controller('trades')
export class TradesController {
  constructor(
    private readonly executeBuy: ExecuteBuyUseCase,
    private readonly executeSell: ExecuteSellUseCase,
    private readonly getTrades: GetTradesService,
  ) {}

  @Get()
  findAll(@Query('userId') userId?: string, @Query('assetId') assetId?: string) {
    if (userId) return this.getTrades.findByUser(userId);
    if (assetId) return this.getTrades.findByAsset(assetId);
    return this.getTrades.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getTrades.findOne(id);
  }

  @Post('buy')
  buy(@Body() body: ExecuteTradeDto) {
    return this.executeBuy.execute(body);
  }

  @Post('sell')
  sell(@Body() body: ExecuteTradeDto) {
    return this.executeSell.execute(body);
  }
}
