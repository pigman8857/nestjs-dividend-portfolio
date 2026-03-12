import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PriceTick, PriceTickDocument } from './price-tick.schema';

@Injectable()
export class PriceTicksService {
  constructor(
    @InjectModel(PriceTick.name)
    private readonly priceTickModel: Model<PriceTickDocument>,
  ) {}

  findByTicker(ticker: string, from?: Date, to?: Date) {
    const filter: Record<string, unknown> = { 'metadata.ticker': ticker.toUpperCase() };
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, unknown>).$gte = from;
      if (to) (filter.timestamp as Record<string, unknown>).$lte = to;
    }
    return this.priceTickModel.find(filter).sort({ timestamp: 1 }).exec();
  }

  create(data: Partial<PriceTick>) {
    return this.priceTickModel.create([data]);
  }
}
