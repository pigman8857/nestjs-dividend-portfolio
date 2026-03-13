import { ClientSession } from 'mongoose';
import { PortfolioEntity } from './portfolio.entity';

export const PORTFOLIO_REPOSITORY = 'IPortfolioRepository';

export interface IPortfolioRepository {
  findAll(): Promise<PortfolioEntity[]>;
  findById(id: string): Promise<PortfolioEntity | null>;
  findByUser(userId: string): Promise<PortfolioEntity[]>;
  findByUserAndAsset(userId: string, assetId: string, session?: ClientSession): Promise<PortfolioEntity | null>;
  createPosition(
    data: Pick<PortfolioEntity, 'userId' | 'assetId' | 'shares' | 'averageCostBasisCents'>,
    session: ClientSession,
  ): Promise<PortfolioEntity>;
  updatePosition(entity: PortfolioEntity, session: ClientSession): Promise<void>;
  delete(id: string): Promise<boolean>;
}
