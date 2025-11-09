export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  SNIPER = 'sniper',
}

export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum DEX {
  RAYDIUM = 'raydium',
  METEORA = 'meteora',
}

export interface Order {
  id: string;
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut?: number;
  limitPrice?: number; // For limit orders
  slippageTolerance: number;
  status: OrderStatus;
  dex?: DEX;
  txHash?: string;
  executedPrice?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRequest {
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  limitPrice?: number;
  slippageTolerance?: number;
}

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
}

export interface StatusUpdate {
  orderId: string;
  status: OrderStatus;
  message?: string;
  txHash?: string;
  executedPrice?: number;
  error?: string;
  dex?: DEX;
}

export interface DEXQuote {
  dex: DEX;
  price: number;
  fee: number;
  amountOut: number;
  liquidity: number;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  executedPrice: number;
  amountOut: number;
  dex: DEX;
  error?: string;
}


