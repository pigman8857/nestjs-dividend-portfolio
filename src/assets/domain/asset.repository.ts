import { AssetEntity } from './asset.entity';

export const ASSET_REPOSITORY = 'IAssetRepository';

export interface IAssetRepository {
  findAll(): Promise<AssetEntity[]>;
  findById(id: string): Promise<AssetEntity | null>;
  findByTicker(ticker: string): Promise<AssetEntity | null>;
  create(data: Omit<AssetEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetEntity>;
  update(id: string, data: Partial<Omit<AssetEntity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AssetEntity | null>;
  delete(id: string): Promise<boolean>;
}
