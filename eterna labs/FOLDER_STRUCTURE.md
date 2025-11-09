# Folder Structure Guide

## 📁 Project Folders Explained

### `/src` - Main Source Code
All application code lives here.

**Subfolders:**
- **`config/`** - Database and Redis configuration
- **`services/`** - Business logic (DEX router, order management, queue processing)
- **`routes/`** - API endpoint handlers
- **`types/`** - TypeScript type definitions
- **`__tests__/`** - Integration tests
- **`test/`** - Test setup configuration
- **`index.ts`** - Main server entry point (starts the application)

### `/postman` - API Testing
- Contains Postman collection file for testing all API endpoints
- Import this file into Postman to test the API

### `/scripts` - Utility Scripts
- **`setup.sh`** - Automated setup script
- **`test-api.sh`** - Script to test API endpoints

### `/docs` - Documentation
- Contains assignment PDF and other documentation

### Root Files
- **`package.json`** - Node.js dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration
- **`jest.config.js`** - Test configuration
- **`docker-compose.yml`** - Docker services (PostgreSQL + Redis)
- **`README.md`** - Main documentation

## 🚀 How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Database Services
```bash
docker-compose up -d
```
This starts PostgreSQL and Redis in Docker containers.

### 3. Build the Project
```bash
npm run build
```
This compiles TypeScript to JavaScript in the `dist/` folder.

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Test the API
```bash
# Run automated tests
npm test

# Or use the test script
./scripts/test-api.sh

# Or use Postman collection
# Import postman/order-execution-engine.json into Postman
```

## 🔍 What Each Folder Does

### `src/config/`
**Purpose**: Database connections
- Connects to PostgreSQL (order history)
- Connects to Redis (cache and queue)
- Creates database tables automatically

### `src/services/`
**Purpose**: Core business logic

**Files:**
- **`dex-router.ts`** - Queries Raydium and Meteora, compares prices, selects best DEX
- **`order-service.ts`** - Creates orders, updates status, saves to database
- **`queue-service.ts`** - Processes orders through BullMQ queue with retry logic

### `src/routes/`
**Purpose**: API endpoints
- **`orders.ts`** - Handles all HTTP requests and WebSocket connections
  - POST `/api/orders/execute` - Create order
  - GET `/api/orders/:orderId` - Get order status
  - WebSocket `/api/orders/:orderId/status` - Real-time updates
  - GET `/api/queue/metrics` - Queue statistics

### `src/types/`
**Purpose**: TypeScript type definitions
- Defines order types, statuses, DEX types
- Ensures type safety throughout the application

### `src/__tests__/`
**Purpose**: Integration tests
- Tests complete order flow from creation to execution
- Tests DEX routing logic
- Tests error handling

## 📊 Data Flow

```
1. User sends POST /api/orders/execute
   ↓
2. Route handler (src/routes/orders.ts)
   ↓
3. Order Service (src/services/order-service.ts) creates order
   ↓
4. Queue Service (src/services/queue-service.ts) adds to queue
   ↓
5. Worker processes order:
   - DEX Router (src/services/dex-router.ts) gets quotes
   - Selects best DEX
   - Executes swap
   ↓
6. Updates order status via WebSocket
   ↓
7. Saves to database (PostgreSQL)
```

## 🛠️ Development Workflow

1. **Make changes** in `src/` folder
2. **Build** with `npm run build`
3. **Test** with `npm test`
4. **Run** with `npm run dev` (auto-reloads on changes)

## 🐳 Docker Services

**PostgreSQL** (port 5432)
- Stores order history
- Automatically creates tables on startup

**Redis** (port 6379)
- Caches active orders
- Backend for BullMQ queue

## 📝 Key Files to Understand

1. **`src/index.ts`** - Application entry point
2. **`src/routes/orders.ts`** - API endpoints
3. **`src/services/order-service.ts`** - Order management
4. **`src/services/dex-router.ts`** - DEX routing logic
5. **`src/services/queue-service.ts`** - Queue processing

## ✅ Checklist Before Running

- [ ] Node.js 18+ installed
- [ ] Docker installed and running
- [ ] Dependencies installed (`npm install`)
- [ ] Docker services started (`docker-compose up -d`)
- [ ] Project built (`npm run build`)
- [ ] Server started (`npm start` or `npm run dev`)

## 🆘 Troubleshooting

**Port already in use?**
- Change PORT in `.env` file

**Database connection error?**
- Check if Docker containers are running: `docker ps`
- Check if PostgreSQL is accessible: `docker exec -it order-engine-postgres psql -U postgres`

**Redis connection error?**
- Check if Redis container is running: `docker ps`
- Test Redis: `docker exec -it order-engine-redis redis-cli ping`

**Tests failing?**
- Make sure Docker services are running
- Check database connection in test setup


