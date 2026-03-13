import { AlertEntity } from './alert.entity';

export const ALERT_REPOSITORY = 'IAlertRepository';

export interface IAlertRepository {
  findAll(): Promise<AlertEntity[]>;
  findByUser(userId: string): Promise<AlertEntity[]>;
  findById(id: string): Promise<AlertEntity | null>;
  findActiveByAsset(assetId: string): Promise<AlertEntity[]>;
  create(data: Pick<AlertEntity, 'userId' | 'assetId' | 'condition' | 'targetPriceCents'>): Promise<AlertEntity>;
  update(id: string, data: Partial<Pick<AlertEntity, 'condition' | 'targetPriceCents' | 'isTriggered' | 'triggeredAt'>>): Promise<AlertEntity | null>;
  delete(id: string): Promise<boolean>;
}
