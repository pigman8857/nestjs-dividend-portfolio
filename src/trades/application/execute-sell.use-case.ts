import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IUserRepository, USER_REPOSITORY } from '../../users/domain/user.repository';
import { IPortfolioRepository, PORTFOLIO_REPOSITORY } from '../../portfolios/domain/portfolio.repository';
import { ITradeRepository, TRADE_REPOSITORY } from '../domain/trade.repository';
import { TradeEntity } from '../domain/trade.entity';
import { DomainError, EntityNotFoundError } from '../../common/errors/domain.errors';
import { ExecuteTradeDto } from '../presentation/dto/execute-trade.dto';

@Injectable()
export class ExecuteSellUseCase {
  private readonly logger = new Logger(ExecuteSellUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(PORTFOLIO_REPOSITORY) private readonly portfolios: IPortfolioRepository,
    @Inject(TRADE_REPOSITORY) private readonly trades: ITradeRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async execute(dto: ExecuteTradeDto): Promise<TradeEntity> {
    const totalAmountCents = dto.shares * dto.pricePerShareCents;
    const session = await this.connection.startSession();
    const startMs = Date.now();
    this.logger.debug({ userId: dto.userId, assetId: dto.assetId }, '[ADB-TEST] Starting transaction (sell)');
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
      const durationMs = Date.now() - startMs;
      this.logger.log(
        { userId: dto.userId, assetId: dto.assetId, shares: dto.shares, totalAmountCents, durationMs },
        '[ADB-TEST] Transaction committed (sell) — ADB supports multi-doc transactions ✓',
      );
      return result!;
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      if (err instanceof DomainError) {
        this.logger.warn(
          { userId: dto.userId, error: err.name, durationMs },
          '[ADB-TEST] Transaction aborted (sell) — domain error, not a MongoDB failure',
        );
      } else {
        this.logger.error(
          { userId: dto.userId, error: err.message, durationMs },
          '[ADB-TEST] Transaction aborted (sell) ✗',
        );
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
