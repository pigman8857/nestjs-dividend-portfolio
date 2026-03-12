import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { Alert } from './alert.schema';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@Query('userId') userId?: string) {
    if (userId) return this.alertsService.findByUser(userId);
    return this.alertsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alertsService.findOne(id);
  }

  @Post()
  create(@Body() body: Partial<Alert>) {
    return this.alertsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Alert>) {
    return this.alertsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.alertsService.delete(id);
  }
}
