import { PortfolioEntity } from './portfolio.entity';
import { InsufficientSharesError } from '../../common/errors/domain.errors';

describe('PortfolioEntity', () => {
  function makePortfolio(shares: number, avgCostBasis: number): PortfolioEntity {
    return new PortfolioEntity('pid', 'uid', 'aid', shares, avgCostBasis);
  }

  describe('addShares', () => {
    it('calculates weighted average cost basis correctly', () => {
      const portfolio = makePortfolio(10, 10000); // 10 shares @ $100
      portfolio.addShares(10, 20000); // 10 more @ $200
      // WACB = (10*10000 + 10*20000) / 20 = 300000/20 = 15000
      expect(portfolio.shares).toBe(20);
      expect(portfolio.averageCostBasisCents).toBe(15000);
    });

    it('sets WACB to price when starting from 0 shares', () => {
      const portfolio = makePortfolio(0, 0);
      portfolio.addShares(5, 24500);
      expect(portfolio.shares).toBe(5);
      expect(portfolio.averageCostBasisCents).toBe(24500);
    });

    it('rounds WACB to nearest cent', () => {
      const portfolio = makePortfolio(1, 10000);
      portfolio.addShares(2, 10001); // (1*10000 + 2*10001) / 3 = 30002/3 = 10000.666... → 10001
      expect(portfolio.averageCostBasisCents).toBe(10001);
    });
  });

  describe('removeShares', () => {
    it('reduces shares correctly', () => {
      const portfolio = makePortfolio(10, 15000);
      portfolio.removeShares(4);
      expect(portfolio.shares).toBe(6);
    });

    it('throws InsufficientSharesError when removing more than held', () => {
      const portfolio = makePortfolio(3, 15000);
      expect(() => portfolio.removeShares(5)).toThrow(InsufficientSharesError);
    });

    it('allows removing all shares', () => {
      const portfolio = makePortfolio(5, 15000);
      portfolio.removeShares(5);
      expect(portfolio.shares).toBe(0);
    });
  });
});
