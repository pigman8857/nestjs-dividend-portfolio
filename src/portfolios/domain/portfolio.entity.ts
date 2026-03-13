import { InsufficientSharesError } from '../../common/errors/domain.errors';

export class PortfolioEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly assetId: string,
    public shares: number,
    public averageCostBasisCents: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  // Recalculates volume-weighted average cost basis when adding shares (buy)
  addShares(newShares: number, pricePerShareCents: number): void {
    const totalShares = this.shares + newShares;
    this.averageCostBasisCents = Math.round(
      (this.shares * this.averageCostBasisCents + newShares * pricePerShareCents) / totalShares,
    );
    this.shares = totalShares;
  }

  removeShares(shares: number): void {
    if (this.shares < shares) {
      throw new InsufficientSharesError(this.userId, shares, this.shares);
    }
    this.shares -= shares;
  }
}
