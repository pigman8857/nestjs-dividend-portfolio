import { Inject, Injectable } from '@nestjs/common';
import { ITradeRepository, TRADE_REPOSITORY } from '../domain/trade.repository';
import { TradeEntity } from '../domain/trade.entity';
import { EntityNotFoundError } from '../../common/errors/domain.errors';

@Injectable()
export class GetTradesService {
  constructor(
    @Inject(TRADE_REPOSITORY) private readonly repo: ITradeRepository,
  ) {}

  findAll(): Promise<TradeEntity[]> {
    return this.repo.findAll();
  }

  findByUser(userId: string): Promise<TradeEntity[]> {
    return this.repo.findByUser(userId);
  }

  findByAsset(assetId: string): Promise<TradeEntity[]> {
    return this.repo.findByAsset(assetId);
  }

  async findOne(id: string): Promise<TradeEntity> {
    const trade = await this.repo.findById(id);
    if (!trade) throw new EntityNotFoundError('Trade', id);
    return trade;
  }
}
