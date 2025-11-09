import { OrderService } from '../order-service';
import { OrderType, OrderStatus, DEX } from '../../types/order';

// Mock database and Redis
jest.mock('../../config/database', () => ({
  dbPool: {
    query: jest.fn(),
  },
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
  },
}));

describe('OrderService', () => {
  let orderService: OrderService;
  let mockDbQuery: jest.Mock;
  let mockRedisGet: jest.Mock;
  let mockRedisSetex: jest.Mock;

  beforeEach(() => {
    orderService = new OrderService();
    const { dbPool, redis } = require('../../config/database');
    mockDbQuery = dbPool.query;
    mockRedisGet = redis.get;
    mockRedisSetex = redis.setex;
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create a new order with pending status', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const orderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        slippageTolerance: 0.01,
      };

      const order = await orderService.createOrder(orderRequest);

      expect(order.id).toBeDefined();
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.type).toBe(OrderType.MARKET);
      expect(order.tokenIn).toBe('SOL');
      expect(order.tokenOut).toBe('USDC');
      expect(order.amountIn).toBe(100);
      expect(mockDbQuery).toHaveBeenCalled();
      expect(mockRedisSetex).toHaveBeenCalled();
    });

    it('should use default slippage tolerance if not provided', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const orderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
      };

      const order = await orderService.createOrder(orderRequest);

      expect(order.slippageTolerance).toBe(0.01); // Default 1%
    });
  });

  describe('getOrder', () => {
    it('should get order from Redis cache', async () => {
      const mockOrder = {
        id: 'test-order-1',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        status: OrderStatus.PENDING,
      };

      mockRedisGet.mockResolvedValue(JSON.stringify(mockOrder));

      const order = await orderService.getOrder('test-order-1');

      expect(order).toBeDefined();
      expect(order?.id).toBe('test-order-1');
      expect(mockRedisGet).toHaveBeenCalledWith('order:test-order-1');
    });

    it('should fallback to database if not in Redis', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockDbQuery.mockResolvedValue({
        rows: [
          {
            id: 'test-order-2',
            type: 'market',
            token_in: 'SOL',
            token_out: 'USDC',
            amount_in: '100',
            slippage_tolerance: '0.01',
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const order = await orderService.getOrder('test-order-2');

      expect(order).toBeDefined();
      expect(order?.id).toBe('test-order-2');
      expect(mockDbQuery).toHaveBeenCalled();
    });
  });

  describe('routeOrder', () => {
    it('should route order to best DEX', async () => {
      const order = {
        id: 'test-order-3',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        slippageTolerance: 0.01,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const selectedDEX = await orderService.routeOrder(order);

      expect([DEX.RAYDIUM, DEX.METEORA]).toContain(selectedDEX);
    });
  });
});


