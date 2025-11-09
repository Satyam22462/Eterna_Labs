import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { QueueJob, QueueConfig } from '../types/queue';
import { OrderService } from './order-service';
import { OrderStatus, Order } from '../types/order';

export class QueueService {
  private queue: Queue;
  private worker: Worker;
  private queueEvents: QueueEvents;
  private orderService: OrderService;
  private statusUpdateCallbacks: Map<string, (status: any) => void> = new Map();

  constructor(redisConnection: Redis, orderService: OrderService) {
    this.orderService = orderService;

    const queueConfig: QueueConfig = {
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10'),
      rateLimit: parseInt(process.env.QUEUE_RATE_LIMIT || '100'),
      maxAttempts: 3,
    };

    // Create queue
    this.queue = new Queue('order-execution', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: queueConfig.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    // Create worker
    this.worker = new Worker(
      'order-execution',
      async (job) => {
        return await this.processOrder(job.data);
      },
      {
        connection: redisConnection,
        concurrency: queueConfig.concurrency,
        limiter: {
          max: queueConfig.rateLimit,
          duration: 60000, // Per minute
        },
      }
    );

    // Create queue events for monitoring
    this.queueEvents = new QueueEvents('order-execution', {
      connection: redisConnection,
    });

    this.setupEventHandlers();
  }

  /**
   * Add order to queue
   */
  async addOrder(orderId: string, orderData: any): Promise<void> {
    await this.queue.add('execute-order', {
      orderId,
      ...orderData,
    });
  }

  /**
   * Register callback for status updates
   */
  registerStatusUpdateCallback(orderId: string, callback: (status: any) => void): void {
    this.statusUpdateCallbacks.set(orderId, callback);
  }

  /**
   * Remove status update callback
   */
  removeStatusUpdateCallback(orderId: string): void {
    this.statusUpdateCallbacks.delete(orderId);
  }

  /**
   * Process order through the execution pipeline
   */
  private async processOrder(jobData: any): Promise<void> {
    const { orderId } = jobData;
    let order: Order | null = null;

    try {
      // Get order
      order = await this.orderService.getOrder(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Step 1: Routing - Compare DEX prices
      this.emitStatusUpdate(orderId, {
        orderId,
        status: OrderStatus.ROUTING,
        message: 'Comparing prices from Raydium and Meteora',
      });

      const selectedDEX = await this.orderService.routeOrder(order);
      await this.orderService.updateOrderStatus(orderId, OrderStatus.ROUTING, {
        dex: selectedDEX,
      });
      order.dex = selectedDEX;

      // Step 2: Building transaction
      this.emitStatusUpdate(orderId, {
        orderId,
        status: OrderStatus.BUILDING,
        message: `Building transaction for ${selectedDEX}`,
        dex: selectedDEX,
      });

      await this.orderService.updateOrderStatus(orderId, OrderStatus.BUILDING);

      // Step 3: Submit transaction
      this.emitStatusUpdate(orderId, {
        orderId,
        status: OrderStatus.SUBMITTED,
        message: 'Transaction submitted to network',
        dex: selectedDEX,
      });

      await this.orderService.updateOrderStatus(orderId, OrderStatus.SUBMITTED);

      // Step 4: Execute swap
      const result = await this.orderService.executeOrder(order);

      // Step 5: Confirm transaction
      await this.orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, {
        txHash: result.txHash,
        executedPrice: result.executedPrice,
        amountOut: order.amountIn * result.executedPrice,
      });

      this.emitStatusUpdate(orderId, {
        orderId,
        status: OrderStatus.CONFIRMED,
        message: 'Order executed successfully',
        txHash: result.txHash,
        executedPrice: result.executedPrice,
        dex: selectedDEX,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      console.error(`Error processing order ${orderId}:`, errorMessage);

      if (order) {
        await this.orderService.updateOrderStatus(orderId, OrderStatus.FAILED, {
          error: errorMessage,
        });
      }

      this.emitStatusUpdate(orderId, {
        orderId,
        status: OrderStatus.FAILED,
        message: 'Order execution failed',
        error: errorMessage,
      });

      // Re-throw to trigger retry logic
      throw error;
    }
  }

  /**
   * Emit status update to registered callbacks
   */
  private emitStatusUpdate(orderId: string, status: any): void {
    const callback = this.statusUpdateCallbacks.get(orderId);
    if (callback) {
      callback(status);
    }
  }

  /**
   * Setup queue event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`[Queue] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[Queue] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('[Queue] Worker error:', err);
    });
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }

  /**
   * Close queue and worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
  }
}


