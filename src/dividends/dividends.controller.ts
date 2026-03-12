import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DividendsService } from './dividends.service';
import { Dividend } from './dividend.schema';

@Controller('dividends')
export class DividendsController {
  constructor(private readonly dividendsService: DividendsService) {}

  @Get()
  find(@Query('ticker') ticker?: string, @Query('assetId') assetId?: string) {
    if (assetId) return this.dividendsService.findByAsset(assetId);
    return this.dividendsService.findByTicker(ticker ?? '');
  }

  @Post()
  create(@Body() body: Partial<Dividend>) {
    return this.dividendsService.create(body);
  }
}
