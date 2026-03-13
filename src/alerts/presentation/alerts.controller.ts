import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AlertsService } from '../application/alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

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
  create(@Body() body: CreateAlertDto) {
    return this.alertsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateAlertDto) {
    return this.alertsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.alertsService.delete(id);
  }
}
