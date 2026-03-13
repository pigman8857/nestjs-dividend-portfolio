import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Alert, AlertSchema } from './infrastructure/alert.schema';
import { MongooseAlertRepository } from './infrastructure/alert.repository.impl';
import { AlertChangeStreamListener } from './infrastructure/alert-change-stream.listener';
import { ALERT_REPOSITORY } from './domain/alert.repository';
import { AlertsService } from './application/alerts.service';
import { AlertsController } from './presentation/alerts.controller';
import { AlertsGateway } from './presentation/alerts.gateway';

@Module({
  imports: [MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }])],
  providers: [
    { provide: ALERT_REPOSITORY, useClass: MongooseAlertRepository },
    AlertsService,
    AlertChangeStreamListener,
    AlertsGateway,
  ],
  controllers: [AlertsController],
})
export class AlertsModule {}
