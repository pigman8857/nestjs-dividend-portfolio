import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserEntity } from '../domain/user.entity';
import { EntityNotFoundError } from '../../common/errors/domain.errors';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: IUserRepository,
  ) {}

  findAll(): Promise<UserEntity[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.repo.findById(id);
    if (!user) throw new EntityNotFoundError('User', id);
    return user;
  }

  create(data: Pick<UserEntity, 'email' | 'name' | 'cashBalanceCents'>): Promise<UserEntity> {
    return this.repo.create(data);
  }

  async update(
    id: string,
    data: Partial<Pick<UserEntity, 'email' | 'name' | 'cashBalanceCents'>>,
  ): Promise<UserEntity> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new EntityNotFoundError('User', id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new EntityNotFoundError('User', id);
  }
}
