import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Asset } from './asset.schema';

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
  create(@Body() body: Partial<Asset>) {
    return this.assetsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Asset>) {
    return this.assetsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }
}
