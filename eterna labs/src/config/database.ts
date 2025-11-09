import { Pool } from 'pg';
import Redis from 'ioredis';

export const dbPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'order_engine',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  const client = await dbPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        token_in VARCHAR(255) NOT NULL,
        token_out VARCHAR(255) NOT NULL,
        amount_in DECIMAL(20, 8) NOT NULL,
        amount_out DECIMAL(20, 8),
        limit_price DECIMAL(20, 8),
        slippage_tolerance DECIMAL(5, 4) NOT NULL,
        status VARCHAR(50) NOT NULL,
        dex VARCHAR(50),
        tx_hash VARCHAR(255),
        executed_price DECIMAL(20, 8),
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    `);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}


