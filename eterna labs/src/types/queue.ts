export interface QueueJob {
  id: string;
  orderId: string;
  attemptsMade: number;
  data: {
    orderId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippageTolerance: number;
    limitPrice?: number;
  };
}

export interface QueueConfig {
  concurrency: number;
  rateLimit: number; // orders per minute
  maxAttempts: number;
}


