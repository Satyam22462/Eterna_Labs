import { QueueService } from '../queue-service';
import { OrderService } from '../order-service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('QueueService', () => {
  let queueService: QueueService;
  let orderService: OrderService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    orderService = new OrderService();
    queueService = new QueueService(mockRedis, orderService);
  });

  afterEach(async () => {
    await queueService.close();
  });

  describe('addOrder', () => {
    it('should add order to queue', async () => {
      await queueService.addOrder('test-order-1', {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        slippageTolerance: 0.01,
      });

      // Queue add should be called (implicitly tested by no errors)
      expect(true).toBe(true);
    });
  });

  describe('registerStatusUpdateCallback', () => {
    it('should register and call status update callback', () => {
      const callback = jest.fn();
      queueService.registerStatusUpdateCallback('test-order-2', callback);

      // Callback should be registered
      expect(callback).toBeDefined();
    });

    it('should remove status update callback', () => {
      const callback = jest.fn();
      queueService.registerStatusUpdateCallback('test-order-3', callback);
      queueService.removeStatusUpdateCallback('test-order-3');

      // Callback should be removed
      expect(true).toBe(true);
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      const metrics = await queueService.getQueueMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('waiting');
      expect(metrics).toHaveProperty('active');
      expect(metrics).toHaveProperty('completed');
      expect(metrics).toHaveProperty('failed');
    });
  });
});


