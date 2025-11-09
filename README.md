# Order Execution Engine

A high-performance order execution engine for Solana DEXs (Raydium and Meteora) with real-time WebSocket status updates, queue management, and intelligent DEX routing.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Problem Statement

Build an order execution engine that processes **market orders** with DEX routing and WebSocket status updates. The engine intelligently routes orders to the best available DEX (Raydium or Meteora) based on price and liquidity, providing real-time status updates throughout the execution lifecycle.

## ✨ Features

### Core Features
- ✅ **Market Order Execution** - Immediate execution at best available price
- ✅ **DEX Routing** - Automatically compares Raydium and Meteora prices
- ✅ **WebSocket Updates** - Real-time status streaming (pending → routing → building → submitted → confirmed/failed)
- ✅ **Queue Management** - Handles up to 10 concurrent orders, 100 orders/minute
- ✅ **Retry Logic** - Exponential backoff with ≤3 attempts
- ✅ **Error Handling** - Comprehensive error handling with failure persistence
- ✅ **Slippage Protection** - Configurable slippage tolerance
- ✅ **Order History** - PostgreSQL database for order persistence
- ✅ **Real-time Metrics** - Queue metrics and order status tracking

### Order Status Flow
1. **pending** - Order received and queued
2. **routing** - Comparing DEX prices (Raydium vs Meteora)
3. **building** - Creating transaction for selected DEX
4. **submitted** - Transaction sent to network
5. **confirmed** - Transaction successful (includes txHash)
6. **failed** - Execution failed (includes error message)

## 🏗️ Architecture

### Order Type: Market Order

**Why Market Order?**
- Market orders provide immediate execution at the best available price, making them ideal for demonstrating the core routing and execution flow
- Simplifies the implementation while showcasing the engine's ability to compare prices across multiple DEXs
- Most common order type in DeFi trading

**Extending to Other Order Types:**
- **Limit Orders**: Add a price check before execution - only execute if current price meets the limit price condition
- **Sniper Orders**: Add token launch detection - monitor new token deployments and execute immediately when detected

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Order Execution Engine                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐            │
│  │   HTTP API   │         │  WebSocket   │            │
│  │   (Fastify)  │────────▶│   Updates    │            │
│  └──────────────┘         └──────────────┘            │
│         │                         │                     │
│         │                         ▼                     │
│         │              ┌──────────────────┐            │
│         │              │  Order Service   │            │
│         │              └──────────────────┘            │
│         │                         │                     │
│         │                         ▼                     │
│         │              ┌──────────────────┐            │
│         └─────────────▶│  Queue Service   │            │
│                        │    (BullMQ)      │            │
│                        └──────────────────┘            │
│                                 │                       │
│                                 ▼                       │
│                        ┌──────────────────┐            │
│                        │  DEX Router      │            │
│                        │  (Raydium/       │            │
│                        │   Meteora)       │            │
│                        └──────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌──────────────┐          ┌──────────────┐
│  PostgreSQL  │          │    Redis     │
│  (History)   │          │  (Cache +    │
│              │          │   Queue)     │
└──────────────┘          └──────────────┘
```

### DEX Routing Logic

1. **Fetch Quotes Concurrently** - Queries both Raydium and Meteora simultaneously
2. **Price Comparison** - Compares output amounts after fees
3. **Liquidity Consideration** - Factors in pool liquidity for large orders
4. **Best DEX Selection** - Routes to DEX with best price + liquidity score
5. **Logging** - Logs routing decisions for transparency

### Queue Management

- **Concurrency**: 10 orders processed simultaneously
- **Rate Limit**: 100 orders per minute
- **Retry**: 3 attempts with exponential backoff (2s → 4s → 8s)
- **Failure Handling**: On final failure, status set to "failed" with error message persisted

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Fastify (with WebSocket support)
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL (order history) + Redis (active orders cache)
- **Validation**: Zod
- **Testing**: Jest
- **Mock Implementation**: Simulates DEX responses with realistic delays (2-3 seconds)

## 📋 Prerequisites

Before running this project, you need:

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
3. **npm** - Comes with Node.js

## 🚀 Quick Start

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd order-execution-engine
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Services (PostgreSQL + Redis)
```bash
docker-compose up -d
```

### Step 4: Build the Project
```bash
npm run build
```

### Step 5: Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

The server will start on `http://localhost:3000`

**For detailed setup instructions, see [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)**

## 📡 API Endpoints

### Create Order
```bash
POST /api/orders/execute
Content-Type: application/json

{
  "type": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 100,
  "slippageTolerance": 0.01
}
```

**Response:**
```json
{
  "orderId": "uuid-here",
  "status": "pending"
}
```

### Get Order Status
```bash
GET /api/orders/:orderId
```

### WebSocket Status Updates
```bash
WS /api/orders/:orderId/status
```

### Queue Metrics
```bash
GET /api/queue/metrics
```

### Health Check
```bash
GET /health
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
The project includes **≥10 unit and integration tests** covering:
- DEX router logic (quote fetching, best DEX selection)
- Order service (creation, retrieval, status updates)
- Queue service (order processing, retry logic)
- API routes (order creation, status retrieval)
- Integration tests (complete order flow)

## 📁 Project Structure

```
order-execution-engine/
├── src/                          # Source code
│   ├── config/                   # Configuration files
│   ├── services/                 # Business logic
│   ├── routes/                   # API routes
│   ├── types/                    # TypeScript types
│   └── __tests__/                # Tests
├── postman/                      # API collection
├── scripts/                      # Utility scripts
├── docs/                         # Documentation
└── README.md                     # This file
```

**For detailed folder explanations, see [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)**

## 📝 Environment Variables

Create a `.env` file (optional - defaults work with Docker):

```env
PORT=3000
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=order_engine
QUEUE_CONCURRENCY=10
QUEUE_RATE_LIMIT=100
```

## 🐳 Docker Services

The `docker-compose.yml` file includes:
- **PostgreSQL** - Database for order history
- **Redis** - Cache and queue backend

### Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down
```

## 📚 Documentation

- **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** - Detailed setup guide
- **[HOW_TO_RUN.md](HOW_TO_RUN.md)** - How to run the project
- **[FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)** - Folder structure explanations
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Implementation verification
- **[UPLOAD_TO_GITHUB.md](UPLOAD_TO_GITHUB.md)** - GitHub upload instructions
- **Postman Collection** - Import `postman/order-execution-engine.json` into Postman

## 🎯 Implementation Details

### Mock DEX Router
- Simulates network delays (200ms for quotes)
- Price variance: 2-5% between DEXs (realistic market conditions)
- Execution time: 2-3 seconds (simulating blockchain transaction)
- Generates mock transaction hashes (64 character hex strings)

### Order Processing Flow
1. Order created and stored in database
2. Added to queue for processing
3. Worker fetches quotes from both DEXs
4. Selects best DEX based on price + liquidity
5. Builds and executes transaction
6. Updates status via WebSocket
7. Stores result in database

## 📊 Deliverables

- ✅ **GitHub Repository** - Clean commits and organized structure
- ✅ **API Implementation** - Order execution and routing
- ✅ **WebSocket Updates** - Real-time status streaming
- ✅ **Documentation** - Comprehensive README with design decisions
- ✅ **Postman Collection** - API testing collection
- ✅ **Tests** - ≥10 unit/integration tests (11 tests implemented)
- ⏳ **Deployment** - Ready for deployment
- ⏳ **Demo Video** - To be created (1-2 min YouTube video)

## 🚢 Deployment

### Free Hosting Options
- **Railway** - Easy PostgreSQL + Redis setup
- **Render** - Free tier for PostgreSQL
- **Fly.io** - Good for Node.js apps

### Deployment Steps
1. Set up PostgreSQL and Redis (hosted services)
2. Update environment variables
3. Build the project: `npm run build`
4. Start the server: `npm start`
5. Update README with public URL

## 🔮 Future Enhancements

1. **Real DEX Integration** - Replace mock with actual Raydium/Meteora SDKs
2. **Limit Orders** - Add price condition checking
3. **Sniper Orders** - Add token launch detection
4. **MEV Protection** - Implement front-running protection
5. **Multi-token Swaps** - Support complex routing paths
6. **Analytics Dashboard** - Real-time monitoring and metrics

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Raydium SDK** - https://github.com/raydium-io/raydium-sdk-V2-demo
- **Meteora Docs** - https://docs.meteora.ag/
- **Solana Documentation** - https://docs.solana.com/

---

**Built with ❤️ for Solana DeFi**
