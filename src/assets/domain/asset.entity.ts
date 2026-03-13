export type AssetType = 'ETF' | 'FUND';
export type DividendFrequency = 'monthly' | 'quarterly' | 'annual';

export class AssetEntity {
  constructor(
    public readonly id: string,
    public readonly ticker: string,
    public readonly name: string,
    public readonly type: AssetType,
    public readonly sector: string,
    public readonly expenseRatio: number,
    public readonly dividendFrequency: DividendFrequency,
    public readonly currentPriceCents: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
