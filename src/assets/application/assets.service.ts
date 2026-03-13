import { Inject, Injectable } from '@nestjs/common';
import { ASSET_REPOSITORY, IAssetRepository } from '../domain/asset.repository';
import { AssetEntity } from '../domain/asset.entity';
import { EntityNotFoundError } from '../../common/errors/domain.errors';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly repo: IAssetRepository,
  ) {}

  findAll(): Promise<AssetEntity[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<AssetEntity> {
    const asset = await this.repo.findById(id);
    if (!asset) throw new EntityNotFoundError('Asset', id);
    return asset;
  }

  async findByTicker(ticker: string): Promise<AssetEntity> {
    const asset = await this.repo.findByTicker(ticker);
    if (!asset) throw new EntityNotFoundError('Asset', `ticker:${ticker}`);
    return asset;
  }

  create(data: Omit<AssetEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetEntity> {
    return this.repo.create(data);
  }

  async update(
    id: string,
    data: Partial<Omit<AssetEntity, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<AssetEntity> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new EntityNotFoundError('Asset', id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new EntityNotFoundError('Asset', id);
  }
}
