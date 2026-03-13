import { Inject, Injectable } from '@nestjs/common';
import { DIVIDEND_REPOSITORY, IDividendRepository } from '../domain/dividend.repository';
import { DividendEntity } from '../domain/dividend.entity';

@Injectable()
export class DividendsService {
  constructor(
    @Inject(DIVIDEND_REPOSITORY) private readonly repo: IDividendRepository,
  ) {}

  findByTicker(ticker: string): Promise<DividendEntity[]> {
    return this.repo.findByTicker(ticker);
  }

  findByAsset(assetId: string): Promise<DividendEntity[]> {
    return this.repo.findByAsset(assetId);
  }

  create(data: Omit<DividendEntity, 'id'>): Promise<DividendEntity[]> {
    return this.repo.create(data);
  }
}
