import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DIVIDEND_REPOSITORY,
  IDividendRepository,
} from '../domain/dividend.repository';
import { DividendEntity } from '../domain/dividend.entity';

@Injectable()
export class DividendsService {
  private readonly logger = new Logger(DividendsService.name);

  constructor(
    @Inject(DIVIDEND_REPOSITORY) private readonly repo: IDividendRepository,
  ) {}

  findByTicker(ticker: string): Promise<DividendEntity[]> {
    return this.repo.findByTicker(ticker);
  }

  findByAsset(assetId: string): Promise<DividendEntity[]> {
    return this.repo.findByAsset(assetId);
  }

  async create(data: Omit<DividendEntity, 'id'>): Promise<DividendEntity[]> {
    const startMs = Date.now();
    try {
      const dividends = await this.repo.create(data);
      const durationMs = Date.now() - startMs;
      this.logger.debug(
        { ticker: data.metadata.ticker, durationMs },
        '[ADB-TEST] Time Series insert (dividends) succeeded ✓',
      );
      return dividends;
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      this.logger.error(
        { ticker: data.metadata.ticker, error: err.message, durationMs },
        '[ADB-TEST] Time Series insert (dividends) FAILED ✗',
      );
      throw err;
    }
  }
}
