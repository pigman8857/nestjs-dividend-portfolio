export type TradeType = 'buy' | 'sell';

// Trade documents are immutable — never updated after insertion.
export class TradeEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly assetId: string,
    public readonly type: TradeType,
    public readonly shares: number,
    public readonly pricePerShareCents: number,
    public readonly totalAmountCents: number,
    public readonly executedAt: Date,
  ) {}
}
