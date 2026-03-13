import { ClientSession } from 'mongoose';
import { UserEntity } from './user.entity';

export const USER_REPOSITORY = 'IUserRepository';

export interface IUserRepository {
  findAll(): Promise<UserEntity[]>;
  findById(id: string, session?: ClientSession): Promise<UserEntity | null>;
  create(data: Pick<UserEntity, 'email' | 'name' | 'cashBalanceCents'>): Promise<UserEntity>;
  update(id: string, data: Partial<Pick<UserEntity, 'email' | 'name' | 'cashBalanceCents'>>): Promise<UserEntity | null>;
  delete(id: string): Promise<boolean>;
  deductBalance(id: string, amountCents: number, session: ClientSession): Promise<void>;
  creditBalance(id: string, amountCents: number, session: ClientSession): Promise<void>;
}
