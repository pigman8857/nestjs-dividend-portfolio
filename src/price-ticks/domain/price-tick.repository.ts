import { PriceTickEntity } from './price-tick.entity';

export const PRICE_TICK_REPOSITORY = 'IPriceTickRepository';

export interface IPriceTickRepository {
  findByTicker(ticker: string, from?: Date, to?: Date): Promise<PriceTickEntity[]>;
  create(data: Omit<PriceTickEntity, 'id'>): Promise<PriceTickEntity[]>;
}
