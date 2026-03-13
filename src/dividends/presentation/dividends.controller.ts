import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DividendsService } from '../application/dividends.service';
import { CreateDividendDto } from './dto/create-dividend.dto';

@Controller('dividends')
export class DividendsController {
  constructor(private readonly dividendsService: DividendsService) {}

  @Get()
  find(@Query('ticker') ticker?: string, @Query('assetId') assetId?: string) {
    if (assetId) return this.dividendsService.findByAsset(assetId);
    return this.dividendsService.findByTicker(ticker ?? '');
  }

  @Post()
  create(@Body() body: CreateDividendDto) {
    return this.dividendsService.create(body);
  }
}
