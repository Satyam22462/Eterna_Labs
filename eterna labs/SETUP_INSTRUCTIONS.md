# Setup Instructions - Order Execution Engine

## ⚠️ Prerequisites Required

Before running this project, you need to install:

1. **Node.js 18+** (includes npm)
2. **Docker Desktop** (for PostgreSQL and Redis)

## 📥 Step 1: Install Node.js

### Windows:
1. Download Node.js from: https://nodejs.org/
2. Choose the **LTS version** (recommended)
3. Run the installer and follow the setup wizard
4. Make sure to check "Add to PATH" during installation
5. Restart your terminal/command prompt after installation

### Verify Installation:
```bash
node --version
npm --version
```

You should see version numbers (e.g., `v18.17.0` and `9.6.7`)

## 🐳 Step 2: Install Docker Desktop

### Windows:
1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Run the installer
3. Restart your computer when prompted
4. Launch Docker Desktop
5. Wait for Docker to start (you'll see a whale icon in system tray)

### Verify Installation:
```bash
docker --version
docker-compose --version
```

You should see version numbers.

## 🚀 Step 3: Install Project Dependencies

Once Node.js is installed:

```bash
# Navigate to project folder
cd "C:\Users\LENOVO\OneDrive\Desktop\eterna labs"

# Install dependencies
npm install
```

This will install all required packages (takes 1-2 minutes).

## 🐳 Step 4: Start Database Services

Once Docker is running:

```bash
# Start PostgreSQL and Redis
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### Verify Services are Running:
```bash
docker ps
```

You should see two containers: `order-engine-postgres` and `order-engine-redis`

## 🔨 Step 5: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript.

## ▶️ Step 6: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

The server will start on `http://localhost:3000`

## ✅ Verify Everything is Working

### 1. Check Health Endpoint
Open browser or use curl:
```
http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

### 2. Create an Order
Use Postman or curl:
```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"market\",\"tokenIn\":\"SOL\",\"tokenOut\":\"USDC\",\"amountIn\":100,\"slippageTolerance\":0.01}"
```

## 🆘 Troubleshooting

### Node.js not found?
- Make sure Node.js is installed
- Restart your terminal after installation
- Check if Node.js is in PATH: `where node`

### Docker not found?
- Make sure Docker Desktop is installed and running
- Restart your computer after installation
- Check if Docker is running (whale icon in system tray)

### Port already in use?
- Change PORT in `.env` file
- Or stop the service using port 3000

### Database connection error?
- Make sure Docker containers are running: `docker ps`
- Restart Docker containers: `docker-compose restart`

## 📚 Next Steps

After everything is installed and running:
1. Read `README.md` for project overview
2. Read `HOW_TO_RUN.md` for detailed instructions
3. Import Postman collection from `postman/order-execution-engine.json`
4. Start testing the API!

## 🎯 Quick Command Reference

```bash
# Install dependencies
npm install

# Start Docker services
docker-compose up -d

# Build project
npm run build

# Start server (development)
npm run dev

# Start server (production)
npm start

# Run tests
npm test

# Stop Docker services
docker-compose down
```

## 📞 Need Help?

If you encounter issues:
1. Check that all prerequisites are installed
2. Verify Docker Desktop is running
3. Check the logs: `docker-compose logs`
4. Read the troubleshooting section in `HOW_TO_RUN.md`


