import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './asset.schema';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
  ) {}

  findAll() {
    return this.assetModel.find().exec();
  }

  findOne(id: string) {
    return this.assetModel.findById(id).exec();
  }

  findByTicker(ticker: string) {
    return this.assetModel.findOne({ ticker: ticker.toUpperCase() }).exec();
  }

  create(data: Partial<Asset>) {
    return this.assetModel.create(data);
  }

  update(id: string, data: Partial<Asset>) {
    return this.assetModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  delete(id: string) {
    return this.assetModel.findByIdAndDelete(id).exec();
  }
}
