import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alert, AlertDocument } from './alert.schema';

@Injectable()
export class AlertsService {
  constructor(
    @InjectModel(Alert.name) private readonly alertModel: Model<AlertDocument>,
  ) {}

  findAll() {
    return this.alertModel.find().exec();
  }

  findByUser(userId: string) {
    return this.alertModel.find({ userId }).exec();
  }

  findOne(id: string) {
    return this.alertModel.findById(id).exec();
  }

  create(data: Partial<Alert>) {
    return this.alertModel.create(data);
  }

  update(id: string, data: Partial<Alert>) {
    return this.alertModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  delete(id: string) {
    return this.alertModel.findByIdAndDelete(id).exec();
  }
}
