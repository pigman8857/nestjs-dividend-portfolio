import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Portfolio, PortfolioDocument } from './portfolio.schema';
import { IPortfolioRepository } from '../domain/portfolio.repository';
import { PortfolioEntity } from '../domain/portfolio.entity';

@Injectable()
export class MongoosePortfolioRepository implements IPortfolioRepository {
  constructor(
    @InjectModel(Portfolio.name) private readonly model: Model<PortfolioDocument>,
  ) {}

  async findAll(): Promise<PortfolioEntity[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<PortfolioEntity | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUser(userId: string): Promise<PortfolioEntity[]> {
    const docs = await this.model.find({ userId }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByUserAndAsset(
    userId: string,
    assetId: string,
    session?: ClientSession,
  ): Promise<PortfolioEntity | null> {
    const doc = await this.model
      .findOne({ userId, assetId })
      .session(session ?? null)
      .lean()
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async createPosition(
    data: Pick<PortfolioEntity, 'userId' | 'assetId' | 'shares' | 'averageCostBasisCents'>,
    session: ClientSession,
  ): Promise<PortfolioEntity> {
    const [doc] = await this.model.create([data], { session });
    return this.toEntity(doc.toObject());
  }

  async updatePosition(entity: PortfolioEntity, session: ClientSession): Promise<void> {
    await this.model
      .findByIdAndUpdate(entity.id, {
        shares: entity.shares,
        averageCostBasisCents: entity.averageCostBasisCents,
      })
      .session(session)
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  private toEntity(doc: Record<string, any>): PortfolioEntity {
    return new PortfolioEntity(
      doc._id.toString(),
      doc.userId.toString(),
      doc.assetId.toString(),
      doc.shares,
      doc.averageCostBasisCents,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
