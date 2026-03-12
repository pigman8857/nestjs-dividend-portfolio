import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  findAll(@Query('userId') userId?: string) {
    if (userId) return this.portfoliosService.findByUser(userId);
    return this.portfoliosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.portfoliosService.findOne(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.portfoliosService.delete(id);
  }
}
