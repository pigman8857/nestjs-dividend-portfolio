import { ExecuteBuyUseCase } from './execute-buy.use-case';
import { UserEntity } from '../../users/domain/user.entity';
import { PortfolioEntity } from '../../portfolios/domain/portfolio.entity';
import { TradeEntity } from '../domain/trade.entity';
import { InsufficientFundsError, EntityNotFoundError } from '../../common/errors/domain.errors';

const mockSession = {
  withTransaction: jest.fn((fn) => fn()),
  endSession: jest.fn(),
};

const mockConnection = {
  startSession: jest.fn().mockResolvedValue(mockSession),
};

function makeUserRepo(user: UserEntity | null) {
  return {
    findById: jest.fn().mockResolvedValue(user),
    deductBalance: jest.fn().mockResolvedValue(undefined),
    creditBalance: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function makePortfolioRepo(existing: PortfolioEntity | null = null) {
  return {
    findByUserAndAsset: jest.fn().mockResolvedValue(existing),
    createPosition: jest.fn().mockResolvedValue(existing),
    updatePosition: jest.fn().mockResolvedValue(undefined),
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

const dto = { userId: 'uid1', assetId: 'aid1', shares: 10, pricePerShareCents: 24500 };
const totalAmountCents = dto.shares * dto.pricePerShareCents; // 245000

describe('ExecuteBuyUseCase', () => {
  it('deducts balance and creates portfolio position on first buy', async () => {
    const user = new UserEntity('uid1', 'alice@example.com', 'Alice', 500000);
    const trade = new TradeEntity('tid', 'uid1', 'aid1', 'buy', 10, 24500, 245000, new Date());
    const userRepo = makeUserRepo(user);
    const portfolioRepo = makePortfolioRepo(null);
    const tradeRepo = makeTradeRepo(trade);

    const useCase = new ExecuteBuyUseCase(userRepo as any, portfolioRepo as any, tradeRepo as any, mockConnection as any);
    const result = await useCase.execute(dto);

    expect(userRepo.deductBalance).toHaveBeenCalledWith('uid1', totalAmountCents, mockSession);
    expect(portfolioRepo.createPosition).toHaveBeenCalledWith(
      { userId: 'uid1', assetId: 'aid1', shares: 10, averageCostBasisCents: 24500 },
      mockSession,
    );
    expect(tradeRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'buy', shares: 10, totalAmountCents }),
      mockSession,
    );
    expect(result).toBe(trade);
  });

  it('updates existing position with recalculated WACB on subsequent buy', async () => {
    const user = new UserEntity('uid1', 'alice@example.com', 'Alice', 500000);
    const existing = new PortfolioEntity('pid', 'uid1', 'aid1', 10, 20000);
    const trade = new TradeEntity('tid', 'uid1', 'aid1', 'buy', 10, 24500, 245000, new Date());
    const userRepo = makeUserRepo(user);
    const portfolioRepo = makePortfolioRepo(existing);
    const tradeRepo = makeTradeRepo(trade);

    const useCase = new ExecuteBuyUseCase(userRepo as any, portfolioRepo as any, tradeRepo as any, mockConnection as any);
    await useCase.execute(dto);

    // WACB = (10*20000 + 10*24500) / 20 = 445000/20 = 22250
    expect(existing.shares).toBe(20);
    expect(existing.averageCostBasisCents).toBe(22250);
    expect(portfolioRepo.updatePosition).toHaveBeenCalledWith(existing, mockSession);
  });

  it('throws InsufficientFundsError when user cannot afford the trade', async () => {
    const user = new UserEntity('uid1', 'alice@example.com', 'Alice', 100); // only 1 cent
    const userRepo = makeUserRepo(user);
    const portfolioRepo = makePortfolioRepo(null);
    const tradeRepo = makeTradeRepo({} as TradeEntity);

    const useCase = new ExecuteBuyUseCase(userRepo as any, portfolioRepo as any, tradeRepo as any, mockConnection as any);
    await expect(useCase.execute(dto)).rejects.toThrow(InsufficientFundsError);
    expect(userRepo.deductBalance).not.toHaveBeenCalled();
  });

  it('throws EntityNotFoundError when user does not exist', async () => {
    const userRepo = makeUserRepo(null);
    const portfolioRepo = makePortfolioRepo(null);
    const tradeRepo = makeTradeRepo({} as TradeEntity);

    const useCase = new ExecuteBuyUseCase(userRepo as any, portfolioRepo as any, tradeRepo as any, mockConnection as any);
    await expect(useCase.execute(dto)).rejects.toThrow(EntityNotFoundError);
  });
});
