import Fastify from 'fastify';
import { orderRoutes } from '../orders';
import { OrderService } from '../../services/order-service';
import { QueueService } from '../../services/queue-service';

// Mock services
jest.mock('../../services/order-service');
jest.mock('../../services/queue-service');

describe('Order Routes', () => {
  let app: any;
  let orderService: jest.Mocked<OrderService>;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    orderService = new OrderService() as jest.Mocked<OrderService>;
    queueService = new QueueService({} as any, orderService) as jest.Mocked<QueueService>;

    app = Fastify();
    await app.register(orderRoutes, { orderService, queueService });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/orders/execute', () => {
    it('should create order with valid request', async () => {
      const mockOrder = {
        id: 'test-order-1',
        type: 'market',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      orderService.createOrder = jest.fn().mockResolvedValue(mockOrder);
      queueService.addOrder = jest.fn().mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: {
          type: 'market',
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: 100,
          slippageTolerance: 0.01,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.orderId).toBe('test-order-1');
      expect(body.status).toBe('pending');
    });

    it('should return 400 for invalid request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: {
          type: 'invalid',
          tokenIn: '',
          tokenOut: 'USDC',
          amountIn: -100,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid request body');
    });
  });

  describe('GET /api/orders/:orderId', () => {
    it('should return order if found', async () => {
      const mockOrder = {
        id: 'test-order-2',
        type: 'market',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      orderService.getOrder = jest.fn().mockResolvedValue(mockOrder);

      const response = await app.inject({
        method: 'GET',
        url: '/api/orders/test-order-2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('test-order-2');
    });

    it('should return 404 if order not found', async () => {
      orderService.getOrder = jest.fn().mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/orders/non-existent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Order not found');
    });
  });

  describe('GET /api/queue/metrics', () => {
    it('should return queue metrics', async () => {
      const mockMetrics = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      };

      queueService.getQueueMetrics = jest.fn().mockResolvedValue(mockMetrics);

      const response = await app.inject({
        method: 'GET',
        url: '/api/queue/metrics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual(mockMetrics);
    });
  });
});


