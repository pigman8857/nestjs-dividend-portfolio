import { DividendEntity } from './dividend.entity';

export const DIVIDEND_REPOSITORY = 'IDividendRepository';

export interface IDividendRepository {
  findByTicker(ticker: string): Promise<DividendEntity[]>;
  findByAsset(assetId: string): Promise<DividendEntity[]>;
  create(data: Omit<DividendEntity, 'id'>): Promise<DividendEntity[]>;
}
