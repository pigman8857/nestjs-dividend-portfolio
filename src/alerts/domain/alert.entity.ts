export type AlertCondition = 'above' | 'below';

export class AlertEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly assetId: string,
    public readonly condition: AlertCondition,
    public readonly targetPriceCents: number,
    public isTriggered: boolean,
    public triggeredAt: Date | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  isBreached(closeCents: number): boolean {
    if (this.isTriggered) return false;
    if (this.condition === 'above') return closeCents >= this.targetPriceCents;
    return closeCents <= this.targetPriceCents;
  }

  trigger(): void {
    this.isTriggered = true;
    this.triggeredAt = new Date();
  }
}
