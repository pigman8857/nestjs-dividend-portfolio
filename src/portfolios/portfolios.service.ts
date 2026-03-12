import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio, PortfolioDocument } from './portfolio.schema';

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectModel(Portfolio.name)
    private readonly portfolioModel: Model<PortfolioDocument>,
  ) {}

  findAll() {
    return this.portfolioModel.find().exec();
  }

  findByUser(userId: string) {
    return this.portfolioModel.find({ userId }).exec();
  }

  findOne(id: string) {
    return this.portfolioModel.findById(id).exec();
  }

  delete(id: string) {
    return this.portfolioModel.findByIdAndDelete(id).exec();
  }
}
