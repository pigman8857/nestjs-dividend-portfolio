import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dividend, DividendDocument } from './dividend.schema';

@Injectable()
export class DividendsService {
  constructor(
    @InjectModel(Dividend.name)
    private readonly dividendModel: Model<DividendDocument>,
  ) {}

  findByTicker(ticker: string) {
    return this.dividendModel
      .find({ 'metadata.ticker': ticker.toUpperCase() })
      .sort({ exDate: -1 })
      .exec();
  }

  findByAsset(assetId: string) {
    return this.dividendModel
      .find({ 'metadata.assetId': assetId })
      .sort({ exDate: -1 })
      .exec();
  }

  create(data: Partial<Dividend>) {
    return this.dividendModel.create([data]);
  }
}
