import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Trade, TradeDocument } from './trade.schema';
import { User, UserDocument } from '../users/user.schema';
import { Portfolio, PortfolioDocument } from '../portfolios/portfolio.schema';

export interface TradeInput {
  userId: string;
  assetId: string;
  shares: number;
  pricePerShareCents: number;
}

@Injectable()
export class TradesService {
  constructor(
    @InjectModel(Trade.name) private readonly tradeModel: Model<TradeDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Portfolio.name)
    private readonly portfolioModel: Model<PortfolioDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  findAll() {
    return this.tradeModel.find().sort({ executedAt: -1 }).exec();
  }

  findByUser(userId: string) {
    return this.tradeModel.find({ userId }).sort({ executedAt: -1 }).exec();
  }

  findByAsset(assetId: string) {
    return this.tradeModel.find({ assetId }).sort({ executedAt: -1 }).exec();
  }

  findOne(id: string) {
    return this.tradeModel.findById(id).exec();
  }

  async executeBuy(input: TradeInput) {
    const totalAmountCents = input.shares * input.pricePerShareCents;
    const session = await this.connection.startSession();
    try {
      let trade: TradeDocument | undefined;
      await session.withTransaction(async () => {
        const user = await this.userModel.findOneAndUpdate(
          { _id: input.userId, cashBalanceCents: { $gte: totalAmountCents } },
          { $inc: { cashBalanceCents: -totalAmountCents } },
          { new: true, session },
        );
        if (!user) throw new BadRequestException('Insufficient cash balance');

        const existing = await this.portfolioModel.findOne(
          { userId: input.userId, assetId: input.assetId },
          null,
          { session },
        );

        if (existing) {
          const totalShares = existing.shares + input.shares;
          const newAvg = Math.round(
            (existing.shares * existing.averageCostBasisCents +
              input.shares * input.pricePerShareCents) /
              totalShares,
          );
          await this.portfolioModel.findByIdAndUpdate(
            existing._id,
            { shares: totalShares, averageCostBasisCents: newAvg },
            { session },
          );
        } else {
          await this.portfolioModel.create(
            [
              {
                userId: input.userId,
                assetId: input.assetId,
                shares: input.shares,
                averageCostBasisCents: input.pricePerShareCents,
              },
            ],
            { session },
          );
        }

        const [created] = await this.tradeModel.create(
          [
            {
              userId: input.userId,
              assetId: input.assetId,
              type: 'buy',
              shares: input.shares,
              pricePerShareCents: input.pricePerShareCents,
              totalAmountCents,
              executedAt: new Date(),
            },
          ],
          { session },
        );
        trade = created;
      });
      return trade;
    } finally {
      await session.endSession();
    }
  }

  async executeSell(input: TradeInput) {
    const totalAmountCents = input.shares * input.pricePerShareCents;
    const session = await this.connection.startSession();
    try {
      let trade: TradeDocument | undefined;
      await session.withTransaction(async () => {
        const position = await this.portfolioModel.findOne(
          { userId: input.userId, assetId: input.assetId },
          null,
          { session },
        );
        if (!position || position.shares < input.shares) {
          throw new BadRequestException('Insufficient shares');
        }

        const remainingShares = position.shares - input.shares;
        await this.portfolioModel.findByIdAndUpdate(
          position._id,
          { shares: remainingShares },
          { session },
        );

        await this.userModel.findByIdAndUpdate(
          input.userId,
          { $inc: { cashBalanceCents: totalAmountCents } },
          { session },
        );

        const [created] = await this.tradeModel.create(
          [
            {
              userId: input.userId,
              assetId: input.assetId,
              type: 'sell',
              shares: input.shares,
              pricePerShareCents: input.pricePerShareCents,
              totalAmountCents,
              executedAt: new Date(),
            },
          ],
          { session },
        );
        trade = created;
      });
      return trade;
    } finally {
      await session.endSession();
    }
  }
}
