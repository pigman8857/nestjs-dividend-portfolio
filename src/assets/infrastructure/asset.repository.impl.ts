import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './asset.schema';
import { IAssetRepository } from '../domain/asset.repository';
import { AssetEntity } from '../domain/asset.entity';

@Injectable()
export class MongooseAssetRepository implements IAssetRepository {
  constructor(
    @InjectModel(Asset.name) private readonly model: Model<AssetDocument>,
  ) {}

  async findAll(): Promise<AssetEntity[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<AssetEntity | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByTicker(ticker: string): Promise<AssetEntity | null> {
    const doc = await this.model.findOne({ ticker: ticker.toUpperCase() }).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async create(data: Omit<AssetEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetEntity> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject());
  }

  async update(
    id: string,
    data: Partial<Omit<AssetEntity, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<AssetEntity | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .lean()
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  private toEntity(doc: Record<string, any>): AssetEntity {
    return new AssetEntity(
      doc._id.toString(),
      doc.ticker,
      doc.name,
      doc.type,
      doc.sector,
      doc.expenseRatio,
      doc.dividendFrequency,
      doc.currentPriceCents,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
