import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PriceTick, PriceTickDocument } from '../price-tick.schema';
import { IPriceTickRepository } from '../domain/price-tick.repository';
import { PriceTickEntity } from '../domain/price-tick.entity';

@Injectable()
export class MongoosePriceTickRepository implements IPriceTickRepository {
  constructor(
    @InjectModel(PriceTick.name) private readonly model: Model<PriceTickDocument>,
  ) {}

  async findByTicker(ticker: string, from?: Date, to?: Date): Promise<PriceTickEntity[]> {
    const filter: Record<string, unknown> = { 'metadata.ticker': ticker.toUpperCase() };
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, unknown>).$gte = from;
      if (to) (filter.timestamp as Record<string, unknown>).$lte = to;
    }
    const docs = await this.model.find(filter).sort({ timestamp: 1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async create(data: Omit<PriceTickEntity, 'id'>): Promise<PriceTickEntity[]> {
    const docs = await this.model.create([data]);
    return docs.map((d) => this.toEntity(d.toObject()));
  }

  private toEntity(doc: Record<string, any>): PriceTickEntity {
    return new PriceTickEntity(
      doc._id.toString(),
      doc.timestamp,
      doc.metadata,
      doc.openCents,
      doc.highCents,
      doc.lowCents,
      doc.closeCents,
      doc.volume,
    );
  }
}
