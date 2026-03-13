import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PriceTickEntity } from '../../price-ticks/domain/price-tick.entity';
import { AlertsService } from '../application/alerts.service';

export interface AlertTriggeredEvent {
  alertId: string;
  userId: string;
  assetId: string;
  condition: string;
  targetPriceCents: number;
  closeCents: number;
  ticker: string;
}

@Injectable()
export class AlertChangeStreamListener {
  private readonly logger = new Logger(AlertChangeStreamListener.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('price_tick.inserted')
  async handlePriceTickInserted(tick: PriceTickEntity): Promise<void> {
    const { closeCents, metadata } = tick;
    const { assetId, ticker } = metadata;

    if (!assetId || closeCents == null) return;

    try {
      const activeAlerts = await this.alertsService.findActiveByAsset(assetId);
      for (const alert of activeAlerts) {
        if (alert.isBreached(closeCents)) {
          await this.alertsService.triggerAlert(alert.id);
          this.eventEmitter.emit('alert.triggered', {
            alertId: alert.id,
            userId: alert.userId,
            assetId: alert.assetId,
            condition: alert.condition,
            targetPriceCents: alert.targetPriceCents,
            closeCents,
            ticker,
          } satisfies AlertTriggeredEvent);
          this.logger.log(
            { alertId: alert.id, userId: alert.userId, assetId, closeCents },
            'Alert triggered',
          );
        }
      }
    } catch (err) {
      this.logger.error('Error processing price tick alert', err);
    }
  }
}
