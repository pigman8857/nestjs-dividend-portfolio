import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Trade, TradeDocument } from './trade.schema';
import { ITradeRepository } from '../domain/trade.repository';
import { TradeEntity, TradeType } from '../domain/trade.entity';

@Injectable()
export class MongooseTradeRepository implements ITradeRepository {
  constructor(
    @InjectModel(Trade.name) private readonly model: Model<TradeDocument>,
  ) {}

  async findAll(): Promise<TradeEntity[]> {
    const docs = await this.model.find().sort({ executedAt: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByUser(userId: string): Promise<TradeEntity[]> {
    const docs = await this.model.find({ userId }).sort({ executedAt: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByAsset(assetId: string): Promise<TradeEntity[]> {
    const docs = await this.model.find({ assetId }).sort({ executedAt: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<TradeEntity | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async insert(
    data: Omit<TradeEntity, 'id'> & { type: TradeType },
    session: ClientSession,
  ): Promise<TradeEntity> {
    const [doc] = await this.model.create([data], { session });
    return this.toEntity(doc.toObject());
  }

  private toEntity(doc: Record<string, any>): TradeEntity {
    return new TradeEntity(
      doc._id.toString(),
      doc.userId.toString(),
      doc.assetId.toString(),
      doc.type,
      doc.shares,
      doc.pricePerShareCents,
      doc.totalAmountCents,
      doc.executedAt,
    );
  }
}
