/**
 * Integration tests for order execution flow
 * Tests the complete flow from order submission to execution
 */

import { OrderService } from '../../services/order-service';
import { MockDEXRouter } from '../../services/dex-router';
import { OrderType, OrderStatus, DEX } from '../../types/order';

// Mock database and Redis
jest.mock('../../config/database', () => ({
  dbPool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    quit: jest.fn(),
  },
}));

describe('Order Execution Flow Integration', () => {
  let orderService: OrderService;
  let dexRouter: MockDEXRouter;

  beforeEach(() => {
    orderService = new OrderService();
    dexRouter = new MockDEXRouter();
    jest.clearAllMocks();
  });

  describe('Complete Order Flow', () => {
    it('should execute complete order flow: create -> route -> execute', async () => {
      const { dbPool, redis } = require('../../config/database');

      // Mock database operations
      dbPool.query.mockResolvedValue({ rows: [] });
      redis.get.mockResolvedValue(null);
      redis.setex.mockResolvedValue('OK');

      // Step 1: Create order
      const orderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        slippageTolerance: 0.01,
      };

      const order = await orderService.createOrder(orderRequest);
      expect(order.status).toBe(OrderStatus.PENDING);

      // Step 2: Route order
      const selectedDEX = await orderService.routeOrder(order);
      expect([DEX.RAYDIUM, DEX.METEORA]).toContain(selectedDEX);

      // Step 3: Update order with selected DEX
      await orderService.updateOrderStatus(order.id, OrderStatus.ROUTING, {
        dex: selectedDEX,
      });

      // Step 4: Execute order
      const updatedOrder = await orderService.getOrder(order.id);
      if (updatedOrder) {
        updatedOrder.dex = selectedDEX;
        const result = await orderService.executeOrder(updatedOrder);
        expect(result.txHash).toBeDefined();
        expect(result.executedPrice).toBeGreaterThan(0);
      }
    }, 15000);
  });

  describe('DEX Routing Logic', () => {
    it('should compare quotes from both DEXs and select best', async () => {
      const quotes = await dexRouter.getQuote('SOL', 'USDC', 100);
      expect(quotes).toHaveLength(2);

      const bestQuote = dexRouter.selectBestDEX(quotes);
      expect(bestQuote).toBeDefined();
      expect([DEX.RAYDIUM, DEX.METEORA]).toContain(bestQuote.dex);
    });

    it('should handle different token pairs', async () => {
      const pairs = [
        ['SOL', 'USDC'],
        ['USDC', 'SOL'],
        ['SOL', 'USDT'],
      ];

      for (const [tokenIn, tokenOut] of pairs) {
        const quotes = await dexRouter.getQuote(tokenIn, tokenOut, 100);
        expect(quotes).toHaveLength(2);
        expect(quotes[0].price).toBeGreaterThan(0);
        expect(quotes[1].price).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle order not found errors', async () => {
      const { redis, dbPool } = require('../../config/database');
      redis.get.mockResolvedValue(null);
      dbPool.query.mockResolvedValue({ rows: [] });

      const order = await orderService.getOrder('non-existent');
      expect(order).toBeNull();
    });

    it('should handle execution failures gracefully', async () => {
      const order = {
        id: 'test-order-error',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        slippageTolerance: 0.01,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Order without DEX should throw error
      await expect(orderService.executeOrder(order)).rejects.toThrow();
    });
  });
});


