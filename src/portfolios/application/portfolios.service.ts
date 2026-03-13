import { Inject, Injectable } from '@nestjs/common';
import { IPortfolioRepository, PORTFOLIO_REPOSITORY } from '../domain/portfolio.repository';
import { PortfolioEntity } from '../domain/portfolio.entity';
import { EntityNotFoundError } from '../../common/errors/domain.errors';

@Injectable()
export class PortfoliosService {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY) private readonly repo: IPortfolioRepository,
  ) {}

  findAll(): Promise<PortfolioEntity[]> {
    return this.repo.findAll();
  }

  findByUser(userId: string): Promise<PortfolioEntity[]> {
    return this.repo.findByUser(userId);
  }

  async findOne(id: string): Promise<PortfolioEntity> {
    const position = await this.repo.findById(id);
    if (!position) throw new EntityNotFoundError('Portfolio', id);
    return position;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new EntityNotFoundError('Portfolio', id);
  }
}
