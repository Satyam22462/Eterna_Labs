# How to Run the Order Execution Engine

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Services
```bash
docker-compose up -d
```
This starts PostgreSQL and Redis in Docker.

### Step 3: Run the Server
```bash
# Build the project
npm run build

# Start the server
npm start

# OR for development (auto-reload)
npm run dev
```

That's it! The server will be running on `http://localhost:3000`

## 📋 Detailed Steps

### Prerequisites
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **npm** - Comes with Node.js

### 1. Install Dependencies
```bash
npm install
```
This installs all required packages from `package.json`.

### 2. Start Database Services
```bash
docker-compose up -d
```
This command:
- Starts PostgreSQL container (port 5432)
- Starts Redis container (port 6379)
- Runs in background (`-d` flag)

**Check if services are running:**
```bash
docker ps
```
You should see two containers: `order-engine-postgres` and `order-engine-redis`

### 3. Build the Project
```bash
npm run build
```
This compiles TypeScript code to JavaScript in the `dist/` folder.

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Expected output:**
```
✅ Database initialized
🚀 Server listening on http://0.0.0.0:3000
📊 Health check: http://0.0.0.0:3000/health
📝 API docs: http://0.0.0.0:3000/api/orders/execute
```

## 🧪 Test the API

### Option 1: Using curl
```bash
# Health check
curl http://localhost:3000/health

# Create an order
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "market",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 100,
    "slippageTolerance": 0.01
  }'
```

### Option 2: Using Postman
1. Import `postman/order-execution-engine.json` into Postman
2. Update base URL to `http://localhost:3000`
3. Start testing!

### Option 3: Using the test script
```bash
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

## 🔍 Verify It's Working

### 1. Check Health Endpoint
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### 2. Create an Order
```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "market",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 100,
    "slippageTolerance": 0.01
  }'
```
Expected response:
```json
{
  "orderId": "uuid-here",
  "status": "pending"
}
```

### 3. Check Order Status
```bash
curl http://localhost:3000/api/orders/<order-id>
```

### 4. Check Queue Metrics
```bash
curl http://localhost:3000/api/queue/metrics
```

## 🧪 Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🛑 Stop the Server

Press `Ctrl+C` in the terminal where the server is running.

## 🛑 Stop Docker Services

```bash
docker-compose down
```

This stops and removes the containers.

## 🐛 Troubleshooting

### Port 3000 already in use?
```bash
# Change PORT in .env file
PORT=3001
```

### Docker containers not starting?
```bash
# Check Docker is running
docker ps

# Restart Docker Desktop
# Then try again
docker-compose up -d
```

### Database connection error?
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs order-engine-postgres
```

### Redis connection error?
```bash
# Check if Redis is running
docker ps | grep redis

# Test Redis
docker exec -it order-engine-redis redis-cli ping
# Should return: PONG
```

### Build errors?
```bash
# Clean and reinstall
rm -rf node_modules dist
npm install
npm run build
```

## 📊 Monitor the Application

### View Logs
The server logs are displayed in the terminal where you ran `npm start` or `npm run dev`.

### Check Database
```bash
# Connect to PostgreSQL
docker exec -it order-engine-postgres psql -U postgres -d order_engine

# View orders table
SELECT * FROM orders;

# Exit
\q
```

### Check Redis
```bash
# Connect to Redis
docker exec -it order-engine-redis redis-cli

# View all keys
KEYS *

# Exit
exit
```

## 🎯 Next Steps

1. **Read the README** - Full documentation in `README.md`
2. **Check Folder Structure** - See `FOLDER_STRUCTURE.md` for folder explanations
3. **Import Postman Collection** - Test all endpoints
4. **Run Tests** - Verify everything works
5. **Create Orders** - Test the order execution flow

## 📚 Useful Commands

```bash
# Install dependencies
npm install

# Build project
npm run build

# Start server (development)
npm run dev

# Start server (production)
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Start Docker services
docker-compose up -d

# Stop Docker services
docker-compose down

# View Docker logs
docker-compose logs -f

# Check Docker containers
docker ps
```

## ✅ Checklist

Before running, make sure:
- [ ] Node.js 18+ is installed
- [ ] Docker Desktop is installed and running
- [ ] Dependencies are installed (`npm install`)
- [ ] Docker services are running (`docker-compose up -d`)
- [ ] Project is built (`npm run build`)
- [ ] Server is started (`npm start`)

## 🆘 Need Help?

1. Check the logs in the terminal
2. Check Docker container logs: `docker-compose logs`
3. Verify all services are running: `docker ps`
4. Check the README.md for more details
5. Check FOLDER_STRUCTURE.md for folder explanations


