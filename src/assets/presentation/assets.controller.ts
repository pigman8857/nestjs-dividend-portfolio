import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssetsService } from '../application/assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Query('ticker') ticker?: string) {
    if (ticker) return this.assetsService.findByTicker(ticker);
    return this.assetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateAssetDto) {
    return this.assetsService.create({
      ticker: body.ticker,
      name: body.name,
      type: body.type,
      sector: body.sector ?? '',
      expenseRatio: body.expenseRatio ?? 0,
      dividendFrequency: body.dividendFrequency,
      currentPriceCents: body.currentPriceCents ?? 0,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.assetsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }
}
