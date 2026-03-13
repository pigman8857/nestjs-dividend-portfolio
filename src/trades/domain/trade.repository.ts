import { ClientSession } from 'mongoose';
import { TradeEntity, TradeType } from './trade.entity';

export const TRADE_REPOSITORY = 'ITradeRepository';

export interface ITradeRepository {
  findAll(): Promise<TradeEntity[]>;
  findByUser(userId: string): Promise<TradeEntity[]>;
  findByAsset(assetId: string): Promise<TradeEntity[]>;
  findById(id: string): Promise<TradeEntity | null>;
  insert(
    data: Omit<TradeEntity, 'id'> & { type: TradeType },
    session: ClientSession,
  ): Promise<TradeEntity>;
}
