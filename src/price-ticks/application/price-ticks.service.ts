import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IPriceTickRepository, PRICE_TICK_REPOSITORY } from '../domain/price-tick.repository';
import { PriceTickEntity } from '../domain/price-tick.entity';

@Injectable()
export class PriceTicksService {
  private readonly logger = new Logger(PriceTicksService.name);

  constructor(
    @Inject(PRICE_TICK_REPOSITORY) private readonly repo: IPriceTickRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  findByTicker(ticker: string, from?: Date, to?: Date): Promise<PriceTickEntity[]> {
    return this.repo.findByTicker(ticker, from, to);
  }

  async create(data: Omit<PriceTickEntity, 'id'>): Promise<PriceTickEntity[]> {
    const startMs = Date.now();
    try {
      const ticks = await this.repo.create(data);
      const durationMs = Date.now() - startMs;
      this.logger.debug(
        { ticker: data.metadata.ticker, timestamp: data.timestamp, durationMs },
        '[ADB-TEST] Time Series insert (price_ticks) succeeded ✓',
      );
      for (const tick of ticks) {
        this.eventEmitter.emit('price_tick.inserted', tick);
      }
      return ticks;
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      this.logger.error(
        { ticker: data.metadata.ticker, error: err.message, durationMs },
        '[ADB-TEST] Time Series insert (price_ticks) FAILED ✗',
      );
      throw err;
    }
  }
}
