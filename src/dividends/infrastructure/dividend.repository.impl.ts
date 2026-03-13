import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dividend, DividendDocument } from '../dividend.schema';
import { IDividendRepository } from '../domain/dividend.repository';
import { DividendEntity } from '../domain/dividend.entity';

@Injectable()
export class MongooseDividendRepository implements IDividendRepository {
  constructor(
    @InjectModel(Dividend.name) private readonly model: Model<DividendDocument>,
  ) {}

  async findByTicker(ticker: string): Promise<DividendEntity[]> {
    const docs = await this.model
      .find({ 'metadata.ticker': ticker.toUpperCase() })
      .sort({ exDate: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByAsset(assetId: string): Promise<DividendEntity[]> {
    const docs = await this.model
      .find({ 'metadata.assetId': assetId })
      .sort({ exDate: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toEntity(d));
  }

  async create(data: Omit<DividendEntity, 'id'>): Promise<DividendEntity[]> {
    const docs = await this.model.create([data]);
    return docs.map((d) => this.toEntity(d.toObject()));
  }

  private toEntity(doc: Record<string, any>): DividendEntity {
    return new DividendEntity(
      doc._id.toString(),
      doc.exDate,
      doc.metadata,
      doc.amountPerShareCents,
      doc.paymentDate,
      doc.frequency,
    );
  }
}
