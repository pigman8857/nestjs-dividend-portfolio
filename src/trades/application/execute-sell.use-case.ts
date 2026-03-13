import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IUserRepository, USER_REPOSITORY } from '../../users/domain/user.repository';
import { IPortfolioRepository, PORTFOLIO_REPOSITORY } from '../../portfolios/domain/portfolio.repository';
import { ITradeRepository, TRADE_REPOSITORY } from '../domain/trade.repository';
import { TradeEntity } from '../domain/trade.entity';
import { EntityNotFoundError } from '../../common/errors/domain.errors';
import { ExecuteTradeDto } from '../presentation/dto/execute-trade.dto';

@Injectable()
export class ExecuteSellUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(PORTFOLIO_REPOSITORY) private readonly portfolios: IPortfolioRepository,
    @Inject(TRADE_REPOSITORY) private readonly trades: ITradeRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async execute(dto: ExecuteTradeDto): Promise<TradeEntity> {
    const totalAmountCents = dto.shares * dto.pricePerShareCents;
    const session = await this.connection.startSession();
    try {
      let result: TradeEntity | undefined;
      await session.withTransaction(async () => {
        const position = await this.portfolios.findByUserAndAsset(dto.userId, dto.assetId, session);
        if (!position) throw new EntityNotFoundError('Portfolio position', `${dto.userId}/${dto.assetId}`);

        position.removeShares(dto.shares); // throws InsufficientSharesError if not enough
        await this.portfolios.updatePosition(position, session);

        await this.users.creditBalance(dto.userId, totalAmountCents, session);

        result = await this.trades.insert(
          {
            userId: dto.userId,
            assetId: dto.assetId,
            type: 'sell',
            shares: dto.shares,
            pricePerShareCents: dto.pricePerShareCents,
            totalAmountCents,
            executedAt: new Date(),
          },
          session,
        );
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }
}
