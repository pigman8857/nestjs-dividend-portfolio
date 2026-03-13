import { Inject, Injectable } from '@nestjs/common';
import { ALERT_REPOSITORY, IAlertRepository } from '../domain/alert.repository';
import { AlertEntity } from '../domain/alert.entity';
import { EntityNotFoundError } from '../../common/errors/domain.errors';

@Injectable()
export class AlertsService {
  constructor(
    @Inject(ALERT_REPOSITORY) private readonly repo: IAlertRepository,
  ) {}

  findAll(): Promise<AlertEntity[]> {
    return this.repo.findAll();
  }

  findByUser(userId: string): Promise<AlertEntity[]> {
    return this.repo.findByUser(userId);
  }

  async findOne(id: string): Promise<AlertEntity> {
    const alert = await this.repo.findById(id);
    if (!alert) throw new EntityNotFoundError('Alert', id);
    return alert;
  }

  findActiveByAsset(assetId: string): Promise<AlertEntity[]> {
    return this.repo.findActiveByAsset(assetId);
  }

  create(data: Pick<AlertEntity, 'userId' | 'assetId' | 'condition' | 'targetPriceCents'>): Promise<AlertEntity> {
    return this.repo.create(data);
  }

  async update(
    id: string,
    data: Partial<Pick<AlertEntity, 'condition' | 'targetPriceCents'>>,
  ): Promise<AlertEntity> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new EntityNotFoundError('Alert', id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new EntityNotFoundError('Alert', id);
  }

  async triggerAlert(id: string): Promise<void> {
    await this.repo.update(id, { isTriggered: true, triggeredAt: new Date() });
  }
}
