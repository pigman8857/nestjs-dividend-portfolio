export type DividendFrequency = 'monthly' | 'quarterly' | 'annual';

export class DividendEntity {
  constructor(
    public readonly id: string,
    public readonly exDate: Date,
    public readonly metadata: { ticker: string; assetId: string },
    public readonly amountPerShareCents: number,
    public readonly paymentDate: Date,
    public readonly frequency: DividendFrequency,
  ) {}
}
