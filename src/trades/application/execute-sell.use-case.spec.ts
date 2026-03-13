import { ExecuteSellUseCase } from './execute-sell.use-case';
import { PortfolioEntity } from '../../portfolios/domain/portfolio.entity';
import { TradeEntity } from '../domain/trade.entity';
import { InsufficientSharesError, EntityNotFoundError } from '../../common/errors/domain.errors';

const mockSession = {
  withTransaction: jest.fn((fn) => fn()),
  endSession: jest.fn(),
};

const mockConnection = {
  startSession: jest.fn().mockResolvedValue(mockSession),
};

function makeUserRepo() {
  return {
    creditBalance: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    deductBalance: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function makePortfolioRepo(existing: PortfolioEntity | null) {
  return {
    findByUserAndAsset: jest.fn().mockResolvedValue(existing),
    updatePosition: jest.fn().mockResolvedValue(undefined),
    createPosition: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    delete: jest.fn(),
  };
}

function makeTradeRepo(trade: TradeEntity) {
  return {
    insert: jest.fn().mockResolvedValue(trade),
    findAll: jest.fn(),
    findByUser: jest.fn(),
    findByAsset: jest.fn(),
    findById: jest.fn(),
  };
}

const dto = { userId: 'uid1', assetId: 'aid1', shares: 5, pricePerShareCents: 25000 };
const totalAmountCents = dto.shares * dto.pricePerShareCents; // 125000

describe('ExecuteSellUseCase', () => {
  it('reduces shares and credits user balance', async () => {
    const position = new PortfolioEntity('pid', 'uid1', 'aid1', 10, 20000);
    const trade = new TradeEntity('tid', 'uid1', 'aid1', 'sell', 5, 25000, 125000, new Date());
    const userRepo = makeUserRepo();
    const portfolioRepo = makePortfolioRepo(position);
    const tradeRepo = makeTradeRepo(trade);

    const useCase = new ExecuteSellUseCase(userRepo as any, portfolioRepo as any, tradeRepo as any, mockConnection as any);
    const result = await useCase.execute(dto);

    expect(position.shares).toBe(5);
    expect(portfolioRepo.updatePosition).toHaveBeenCalledWith(position, mockSession);
    expect(userRepo.creditBalance).toHaveBeenCalledWith('uid1', totalAmountCents, mockSession);
    expect(tradeRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sell', shares: 5, totalAmountCents }),
      mockSession,
    );
    expect(result).toBe(trade);
  });

  it('throws InsufficientSharesError when selling more than held', async () => {
    const position = new PortfolioEntity('pid', 'uid1', 'aid1', 2, 20000); // only 2 shares
    const userRepo = makeUserRepo();
    const portfolioRepo = makePortfolioRepo(position);
    const tradeRepo = makeTradeRepo({} as TradeEntity);

    const useCase = new ExecuteSellUseCase(userRepo as any, portfolioRepo as any, tradeRepo as any, mockConnection as any);
    await expect(useCase.execute(dto)).rejects.toThrow(InsufficientSharesError);
    expect(userRepo.creditBalance).not.toHaveBeenCalled();
  });

  it('throws EntityNotFoundError when position does not exist', async () => {
    const userRepo = makeUserRepo();
    const portfolioRepo = makePortfolioRepo(null);
    const tradeRepo = makeTradeRepo({} as TradeEntity);

    const useCase = new ExecuteSellUseCase(userRepo as any, portfolioRepo as any, tradeRepo as any, mockConnection as any);
    await expect(useCase.execute(dto)).rejects.toThrow(EntityNotFoundError);
  });
});
