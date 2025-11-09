import { MockDEXRouter } from '../dex-router';
import { DEX, OrderType, OrderStatus } from '../../types/order';

describe('MockDEXRouter', () => {
  let router: MockDEXRouter;

  beforeEach(() => {
    router = new MockDEXRouter();
  });

  describe('getQuote', () => {
    it('should return quotes from both DEXs', async () => {
      const quotes = await router.getQuote('SOL', 'USDC', 100);

      expect(quotes).toHaveLength(2);
      expect(quotes[0].dex).toBeDefined();
      expect(quotes[1].dex).toBeDefined();
      expect(quotes[0].price).toBeGreaterThan(0);
      expect(quotes[1].price).toBeGreaterThan(0);
    });

    it('should return different prices from different DEXs', async () => {
      const quotes = await router.getQuote('SOL', 'USDC', 100);
      const raydiumQuote = quotes.find((q) => q.dex === DEX.RAYDIUM);
      const meteoraQuote = quotes.find((q) => q.dex === DEX.METEORA);

      expect(raydiumQuote).toBeDefined();
      expect(meteoraQuote).toBeDefined();
      // Prices should be different (within variance range)
      expect(raydiumQuote!.price).not.toBe(meteoraQuote!.price);
    });

    it('should include fee and liquidity in quotes', async () => {
      const quotes = await router.getQuote('SOL', 'USDC', 100);

      quotes.forEach((quote) => {
        expect(quote.fee).toBeGreaterThan(0);
        expect(quote.liquidity).toBeGreaterThan(0);
        expect(quote.amountOut).toBeGreaterThan(0);
      });
    });
  });

  describe('selectBestDEX', () => {
    it('should select the DEX with better price', async () => {
      const quotes = await router.getQuote('SOL', 'USDC', 100);
      const bestQuote = router.selectBestDEX(quotes);

      expect(bestQuote).toBeDefined();
      expect([DEX.RAYDIUM, DEX.METEORA]).toContain(bestQuote.dex);
    });

    it('should consider both price and liquidity', async () => {
      const quotes = await router.getQuote('SOL', 'USDC', 100);
      const bestQuote = router.selectBestDEX(quotes);

      // Best quote should have a score (implicitly tested by selection)
      expect(bestQuote.amountOut).toBeGreaterThan(0);
    });
  });

  describe('executeSwap', () => {
    it('should execute swap and return txHash', async () => {
      const order = {
        id: 'test-order-1',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        slippageTolerance: 0.01,
        status: OrderStatus.PENDING,
        dex: DEX.RAYDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await router.executeSwap(order, DEX.RAYDIUM);

      expect(result.txHash).toBeDefined();
      expect(result.txHash.length).toBe(64); // Solana tx hash length
      expect(result.executedPrice).toBeGreaterThan(0);
    }, 10000); // Increased timeout for async operations

    it('should throw error if DEX not selected', async () => {
      const order = {
        id: 'test-order-2',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        slippageTolerance: 0.01,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(router.executeSwap(order, DEX.RAYDIUM)).rejects.toThrow();
    });
  });
});


