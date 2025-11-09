import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { OrderService } from './services/order-service';
import { QueueService } from './services/queue-service';
import { orderRoutes } from './routes/orders';
import { initializeDatabase, redis, dbPool } from './config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  // Initialize database
  try {
    await initializeDatabase();
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }

  // Initialize services
  const orderService = new OrderService();
  const queueService = new QueueService(redis, orderService);

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(websocket);

  // Register PostgreSQL
  await fastify.register(require('@fastify/postgres'), {
    connectionString: `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${
      process.env.POSTGRES_PASSWORD || 'postgres'
    }@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${
      process.env.POSTGRES_DB || 'order_engine'
    }`,
  });

  // Register routes
  await fastify.register(orderRoutes, {
    orderService,
    queueService,
  });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received, starting graceful shutdown...`);
    
    try {
      await queueService.close();
      await redis.quit();
      await dbPool.end();
      await fastify.close();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📝 API docs: http://${HOST}:${PORT}/api/orders/execute`);
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


