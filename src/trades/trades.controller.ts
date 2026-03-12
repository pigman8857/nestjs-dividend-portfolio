import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { TradesService, TradeInput } from './trades.service';

@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Get()
  findAll(@Query('userId') userId?: string, @Query('assetId') assetId?: string) {
    if (userId) return this.tradesService.findByUser(userId);
    if (assetId) return this.tradesService.findByAsset(assetId);
    return this.tradesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tradesService.findOne(id);
  }

  @Post('buy')
  executeBuy(@Body() body: TradeInput) {
    return this.tradesService.executeBuy(body);
  }

  @Post('sell')
  executeSell(@Body() body: TradeInput) {
    return this.tradesService.executeSell(body);
  }
}
