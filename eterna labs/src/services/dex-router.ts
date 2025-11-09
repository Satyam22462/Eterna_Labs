import { DEX, DEXQuote, Order } from '../types/order';

export interface IDEXRouter {
  getQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<DEXQuote[]>;
  executeSwap(order: Order, dex: DEX): Promise<{ txHash: string; executedPrice: number }>;
}

/**
 * Mock DEX Router Implementation
 * Simulates DEX interactions with realistic delays and price variations
 */
export class MockDEXRouter implements IDEXRouter {
  private basePrices: Map<string, number> = new Map();

  constructor() {
    // Initialize base prices for common token pairs
    this.basePrices.set('SOL-USDC', 100);
    this.basePrices.set('USDC-SOL', 0.01);
    this.basePrices.set('SOL-USDT', 100);
    this.basePrices.set('USDT-SOL', 0.01);
  }

  private getBasePrice(tokenIn: string, tokenOut: string): number {
    const pair = `${tokenIn}-${tokenOut}`;
    const reversePair = `${tokenOut}-${tokenIn}`;
    
    if (this.basePrices.has(pair)) {
      return this.basePrices.get(pair)!;
    }
    if (this.basePrices.has(reversePair)) {
      return 1 / this.basePrices.get(reversePair)!;
    }
    // Default price if pair not found
    return 1;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simulate getting a quote from Raydium
   * Returns price with 2-4% variance
   */
  async getRaydiumQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<DEXQuote> {
    // Simulate network delay (200ms)
    await this.sleep(200);

    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const priceVariation = 0.98 + Math.random() * 0.04; // 98% to 102% of base price
    const price = basePrice * priceVariation;
    const fee = 0.003; // 0.3% fee
    const amountOut = amountIn * price * (1 - fee);
    const liquidity = 1000000 + Math.random() * 500000; // Mock liquidity

    return {
      dex: DEX.RAYDIUM,
      price,
      fee,
      amountOut,
      liquidity,
    };
  }

  /**
   * Simulate getting a quote from Meteora
   * Returns price with 3-5% variance (different from Raydium)
   */
  async getMeteorQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<DEXQuote> {
    // Simulate network delay (200ms)
    await this.sleep(200);

    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const priceVariation = 0.97 + Math.random() * 0.05; // 97% to 102% of base price
    const price = basePrice * priceVariation;
    const fee = 0.002; // 0.2% fee (lower than Raydium)
    const amountOut = amountIn * price * (1 - fee);
    const liquidity = 800000 + Math.random() * 400000; // Mock liquidity

    return {
      dex: DEX.METEORA,
      price,
      fee,
      amountOut,
      liquidity,
    };
  }

  /**
   * Get quotes from both DEXs concurrently
   */
  async getQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<DEXQuote[]> {
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amountIn),
      this.getMeteorQuote(tokenIn, tokenOut, amountIn),
    ]);

    return [raydiumQuote, meteoraQuote];
  }

  /**
   * Select the best DEX based on quotes
   * Considers both price and liquidity
   */
  selectBestDEX(quotes: DEXQuote[]): DEXQuote {
    // Score each quote: higher amountOut is better, but also consider liquidity
    const scoredQuotes = quotes.map((quote) => ({
      ...quote,
      score: quote.amountOut * (1 + Math.log10(quote.liquidity / 100000)), // Logarithmic liquidity bonus
    }));

    // Return the quote with the highest score
    return scoredQuotes.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }

  /**
   * Generate a mock transaction hash
   */
  private generateMockTxHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  /**
   * Simulate executing a swap on the chosen DEX
   * Takes 2-3 seconds to simulate transaction processing
   */
  async executeSwap(order: Order, dex: DEX): Promise<{ txHash: string; executedPrice: number }> {
    if (!order.dex) {
      throw new Error('DEX not selected for order');
    }

    // Simulate 2-3 second execution time
    const executionTime = 2000 + Math.random() * 1000;
    await this.sleep(executionTime);

    // Get the final executed price (may have slight slippage)
    const basePrice = this.getBasePrice(order.tokenIn, order.tokenOut);
    const slippage = 1 + (Math.random() - 0.5) * 0.01; // ±0.5% slippage
    const executedPrice = basePrice * slippage;

    // Generate mock transaction hash
    const txHash = this.generateMockTxHash();

    return {
      txHash,
      executedPrice,
    };
  }
}


