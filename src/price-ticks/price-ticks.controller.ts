import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PriceTicksService } from './price-ticks.service';
import { PriceTick } from './price-tick.schema';

@Controller('price-ticks')
export class PriceTicksController {
  constructor(private readonly priceTicksService: PriceTicksService) {}

  @Get()
  findByTicker(
    @Query('ticker') ticker: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.priceTicksService.findByTicker(
      ticker,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post()
  create(@Body() body: Partial<PriceTick>) {
    return this.priceTicksService.create(body);
  }
}
