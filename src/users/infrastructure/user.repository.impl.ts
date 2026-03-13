import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { IUserRepository } from '../domain/user.repository';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class MongooseUserRepository implements IUserRepository {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
  ) {}

  async findAll(): Promise<UserEntity[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string, session?: ClientSession): Promise<UserEntity | null> {
    const doc = await this.model.findById(id).session(session ?? null).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async create(data: Pick<UserEntity, 'email' | 'name' | 'cashBalanceCents'>): Promise<UserEntity> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject());
  }

  async update(
    id: string,
    data: Partial<Pick<UserEntity, 'email' | 'name' | 'cashBalanceCents'>>,
  ): Promise<UserEntity | null> {
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

  async deductBalance(id: string, amountCents: number, session: ClientSession): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, { $inc: { cashBalanceCents: -amountCents } })
      .session(session)
      .exec();
  }

  async creditBalance(id: string, amountCents: number, session: ClientSession): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, { $inc: { cashBalanceCents: amountCents } })
      .session(session)
      .exec();
  }

  private toEntity(doc: Record<string, any>): UserEntity {
    return new UserEntity(
      doc._id.toString(),
      doc.email,
      doc.name,
      doc.cashBalanceCents,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
