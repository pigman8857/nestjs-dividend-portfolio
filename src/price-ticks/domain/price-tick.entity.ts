export class PriceTickEntity {
  constructor(
    public readonly id: string,
    public readonly timestamp: Date,
    public readonly metadata: { ticker: string; assetId: string },
    public readonly openCents: number,
    public readonly highCents: number,
    public readonly lowCents: number,
    public readonly closeCents: number,
    public readonly volume: number,
  ) {}
}
