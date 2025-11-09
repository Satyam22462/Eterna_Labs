import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OrderRequest, OrderResponse, StatusUpdate, OrderStatus } from '../types/order';
import { OrderService } from '../services/order-service';
import { QueueService } from '../services/queue-service';
import { z } from 'zod';

const orderRequestSchema = z.object({
  type: z.enum(['market', 'limit', 'sniper']),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  slippageTolerance: z.number().min(0).max(1).optional(),
});

export async function orderRoutes(
  fastify: FastifyInstance,
  options: { orderService: OrderService; queueService: QueueService }
) {
  const { orderService, queueService } = options;

  // POST /api/orders/execute - Create order and upgrade to WebSocket
  fastify.post('/api/orders/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      const validationResult = orderRequestSchema.safeParse(request.body);
      if (!validationResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: validationResult.error.errors,
        });
      }

      const orderRequest: OrderRequest = validationResult.data;

      // Create order
      const order = await orderService.createOrder(orderRequest);

      // Add to queue
      await queueService.addOrder(order.id, {
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
        slippageTolerance: order.slippageTolerance,
        limitPrice: order.limitPrice,
      });

      // Check if client wants WebSocket upgrade
      const upgradeHeader = request.headers.upgrade;
      if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
        // WebSocket upgrade will be handled by Fastify
        return reply.code(101).send({ orderId: order.id });
      }

      // Return order ID for HTTP-only requests
      const response: OrderResponse = {
        orderId: order.id,
        status: OrderStatus.PENDING,
      };

      return reply.status(201).send(response);
    } catch (error: any) {
      console.error('Error creating order:', error);
      return reply.status(500).send({
        error: 'Failed to create order',
        message: error.message,
      });
    }
  });

  // WebSocket endpoint for order status updates
  fastify.get('/api/orders/:orderId/status', { websocket: true }, async (connection, req) => {
    const orderId = (req.params as any).orderId as string;

    // Register status update callback
    const statusCallback = (status: StatusUpdate) => {
      try {
        connection.socket.send(JSON.stringify(status));
      } catch (error) {
        console.error(`Error sending WebSocket message for order ${orderId}:`, error);
      }
    };

    queueService.registerStatusUpdateCallback(orderId, statusCallback);

    // Send initial status
    try {
      const order = await orderService.getOrder(orderId);
      if (order) {
        connection.socket.send(
          JSON.stringify({
            orderId: order.id,
            status: order.status,
            message: `Order ${order.status}`,
          })
        );
      } else {
        connection.socket.send(
          JSON.stringify({
            orderId,
            status: OrderStatus.FAILED,
            error: 'Order not found',
          })
        );
      }
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
    }

    // Handle connection close
    connection.socket.on('close', () => {
      queueService.removeStatusUpdateCallback(orderId);
    });

    // Handle errors
    connection.socket.on('error', (error) => {
      console.error(`WebSocket error for order ${orderId}:`, error);
      queueService.removeStatusUpdateCallback(orderId);
    });
  });

  // GET /api/orders/:orderId - Get order status
  fastify.get('/api/orders/:orderId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const orderId = request.params.orderId as string;
      const order = await orderService.getOrder(orderId);

      if (!order) {
        return reply.status(404).send({
          error: 'Order not found',
        });
      }

      return reply.send(order);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      return reply.status(500).send({
        error: 'Failed to fetch order',
        message: error.message,
      });
    }
  });

  // GET /api/orders - List orders (with pagination)
  fastify.get('/api/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const limit = parseInt((request.query as any).limit || '50');
      const offset = parseInt((request.query as any).offset || '0');

      const client = await fastify.pg.connect();
      try {
        const result = await client.query(
          'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2',
          [limit, offset]
        );

        return reply.send({
          orders: result.rows,
          limit,
          offset,
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      return reply.status(500).send({
        error: 'Failed to fetch orders',
        message: error.message,
      });
    }
  });

  // GET /api/queue/metrics - Get queue metrics
  fastify.get('/api/queue/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = await queueService.getQueueMetrics();
      return reply.send(metrics);
    } catch (error: any) {
      console.error('Error fetching queue metrics:', error);
      return reply.status(500).send({
        error: 'Failed to fetch queue metrics',
        message: error.message,
      });
    }
  });
}

