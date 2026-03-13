import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IUserRepository, USER_REPOSITORY } from '../../users/domain/user.repository';
import { IPortfolioRepository, PORTFOLIO_REPOSITORY } from '../../portfolios/domain/portfolio.repository';
import { ITradeRepository, TRADE_REPOSITORY } from '../domain/trade.repository';
import { TradeEntity } from '../domain/trade.entity';
import { DomainError, EntityNotFoundError, InsufficientFundsError } from '../../common/errors/domain.errors';
import { ExecuteTradeDto } from '../presentation/dto/execute-trade.dto';

@Injectable()
export class ExecuteBuyUseCase {
  private readonly logger = new Logger(ExecuteBuyUseCase.name);

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
    this.logger.debug({ userId: dto.userId, assetId: dto.assetId }, '[ADB-TEST] Starting transaction (buy)');
    try {
      let result: TradeEntity | undefined;
      await session.withTransaction(async () => {
        const user = await this.users.findById(dto.userId, session);
        if (!user) throw new EntityNotFoundError('User', dto.userId);
        if (!user.canAfford(totalAmountCents)) {
          throw new InsufficientFundsError(dto.userId, totalAmountCents, user.cashBalanceCents);
        }

        await this.users.deductBalance(dto.userId, totalAmountCents, session);

        const existing = await this.portfolios.findByUserAndAsset(dto.userId, dto.assetId, session);
        if (existing) {
          existing.addShares(dto.shares, dto.pricePerShareCents);
          await this.portfolios.updatePosition(existing, session);
        } else {
          await this.portfolios.createPosition(
            {
              userId: dto.userId,
              assetId: dto.assetId,
              shares: dto.shares,
              averageCostBasisCents: dto.pricePerShareCents,
            },
            session,
          );
        }

        result = await this.trades.insert(
          {
            userId: dto.userId,
            assetId: dto.assetId,
            type: 'buy',
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
        '[ADB-TEST] Transaction committed (buy) — ADB supports multi-doc transactions ✓',
      );
      return result!;
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      if (err instanceof DomainError) {
        this.logger.warn(
          { userId: dto.userId, error: err.name, durationMs },
          '[ADB-TEST] Transaction aborted (buy) — domain error, not a MongoDB failure',
        );
      } else {
        this.logger.error(
          { userId: dto.userId, error: err.message, durationMs },
          '[ADB-TEST] Transaction aborted (buy) ✗',
        );
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
