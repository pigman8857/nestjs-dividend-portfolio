import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PriceTicksService } from '../application/price-ticks.service';
import { CreatePriceTickDto } from './dto/create-price-tick.dto';

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
  create(@Body() body: CreatePriceTickDto) {
    return this.priceTicksService.create(body);
  }
}
