import { Order, OrderRequest, OrderStatus, DEX } from '../types/order';
import { dbPool, redis } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { MockDEXRouter } from './dex-router';

export class OrderService {
  private dexRouter: MockDEXRouter;

  constructor() {
    this.dexRouter = new MockDEXRouter();
  }

  /**
   * Create a new order
   */
  async createOrder(request: OrderRequest): Promise<Order> {
    const orderId = uuidv4();
    const order: Order = {
      id: orderId,
      type: request.type,
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amountIn: request.amountIn,
      slippageTolerance: request.slippageTolerance || 0.01, // Default 1%
      limitPrice: request.limitPrice,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in PostgreSQL
    await this.saveOrderToDB(order);

    // Store in Redis for active orders
    await redis.setex(`order:${orderId}`, 3600, JSON.stringify(order));

    return order;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    // Try Redis first
    const cached = await redis.get(`order:${orderId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to PostgreSQL
    const result = await dbPool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrder(result.rows[0]);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    updates?: Partial<Order>
  ): Promise<void> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const updatedOrder: Order = {
      ...order,
      ...updates,
      status,
      updatedAt: new Date(),
    };

    // Update PostgreSQL
    await this.updateOrderInDB(updatedOrder);

    // Update Redis
    await redis.setex(`order:${orderId}`, 3600, JSON.stringify(updatedOrder));
  }

  /**
   * Get quotes from both DEXs and select the best one
   */
  async routeOrder(order: Order): Promise<DEX> {
    const quotes = await this.dexRouter.getQuote(order.tokenIn, order.tokenOut, order.amountIn);
    const bestQuote = this.dexRouter.selectBestDEX(quotes);

    // Log routing decision
    console.log(`[Routing] Order ${order.id}:`);
    console.log(`  Raydium: ${quotes.find((q) => q.dex === DEX.RAYDIUM)?.amountOut.toFixed(4)} ${order.tokenOut}`);
    console.log(`  Meteora: ${quotes.find((q) => q.dex === DEX.METEORA)?.amountOut.toFixed(4)} ${order.tokenOut}`);
    console.log(`  Selected: ${bestQuote.dex} (Best price)`);

    return bestQuote.dex;
  }

  /**
   * Execute the order on the chosen DEX
   */
  async executeOrder(order: Order): Promise<{ txHash: string; executedPrice: number }> {
    if (!order.dex) {
      throw new Error('DEX not selected for order');
    }

    const result = await this.dexRouter.executeSwap(order, order.dex);
    return result;
  }

  /**
   * Save order to PostgreSQL
   */
  private async saveOrderToDB(order: Order): Promise<void> {
    await dbPool.query(
      `INSERT INTO orders (
        id, type, token_in, token_out, amount_in, amount_out, limit_price,
        slippage_tolerance, status, dex, tx_hash, executed_price, error,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        order.id,
        order.type,
        order.tokenIn,
        order.tokenOut,
        order.amountIn,
        order.amountOut || null,
        order.limitPrice || null,
        order.slippageTolerance,
        order.status,
        order.dex || null,
        order.txHash || null,
        order.executedPrice || null,
        order.error || null,
        order.createdAt,
        order.updatedAt,
      ]
    );
  }

  /**
   * Update order in PostgreSQL
   */
  private async updateOrderInDB(order: Order): Promise<void> {
    await dbPool.query(
      `UPDATE orders SET
        status = $1,
        dex = $2,
        tx_hash = $3,
        executed_price = $4,
        amount_out = $5,
        error = $6,
        updated_at = $7
      WHERE id = $8`,
      [
        order.status,
        order.dex || null,
        order.txHash || null,
        order.executedPrice || null,
        order.amountOut || null,
        order.error || null,
        order.updatedAt,
        order.id,
      ]
    );
  }

  /**
   * Map database row to Order object
   */
  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      type: row.type as any,
      tokenIn: row.token_in,
      tokenOut: row.token_out,
      amountIn: parseFloat(row.amount_in),
      amountOut: row.amount_out ? parseFloat(row.amount_out) : undefined,
      limitPrice: row.limit_price ? parseFloat(row.limit_price) : undefined,
      slippageTolerance: parseFloat(row.slippage_tolerance),
      status: row.status as OrderStatus,
      dex: row.dex as DEX | undefined,
      txHash: row.tx_hash || undefined,
      executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
      error: row.error || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}


