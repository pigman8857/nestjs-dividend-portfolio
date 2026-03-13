import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alert, AlertDocument } from './alert.schema';
import { IAlertRepository } from '../domain/alert.repository';
import { AlertEntity } from '../domain/alert.entity';

@Injectable()
export class MongooseAlertRepository implements IAlertRepository {
  constructor(
    @InjectModel(Alert.name) private readonly model: Model<AlertDocument>,
  ) {}

  async findAll(): Promise<AlertEntity[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByUser(userId: string): Promise<AlertEntity[]> {
    const docs = await this.model.find({ userId }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<AlertEntity | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findActiveByAsset(assetId: string): Promise<AlertEntity[]> {
    const docs = await this.model.find({ assetId, isTriggered: false }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async create(
    data: Pick<AlertEntity, 'userId' | 'assetId' | 'condition' | 'targetPriceCents'>,
  ): Promise<AlertEntity> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject());
  }

  async update(
    id: string,
    data: Partial<Pick<AlertEntity, 'condition' | 'targetPriceCents' | 'isTriggered' | 'triggeredAt'>>,
  ): Promise<AlertEntity | null> {
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

  private toEntity(doc: Record<string, any>): AlertEntity {
    return new AlertEntity(
      doc._id.toString(),
      doc.userId.toString(),
      doc.assetId.toString(),
      doc.condition,
      doc.targetPriceCents,
      doc.isTriggered,
      doc.triggeredAt ?? null,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
