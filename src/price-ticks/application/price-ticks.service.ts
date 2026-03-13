import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IPriceTickRepository, PRICE_TICK_REPOSITORY } from '../domain/price-tick.repository';
import { PriceTickEntity } from '../domain/price-tick.entity';

@Injectable()
export class PriceTicksService {
  constructor(
    @Inject(PRICE_TICK_REPOSITORY) private readonly repo: IPriceTickRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  findByTicker(ticker: string, from?: Date, to?: Date): Promise<PriceTickEntity[]> {
    return this.repo.findByTicker(ticker, from, to);
  }

  async create(data: Omit<PriceTickEntity, 'id'>): Promise<PriceTickEntity[]> {
    const ticks = await this.repo.create(data);
    for (const tick of ticks) {
      this.eventEmitter.emit('price_tick.inserted', tick);
    }
    return ticks;
  }
}
