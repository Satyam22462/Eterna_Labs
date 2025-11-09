#!/bin/bash

# Setup script for Order Execution Engine

echo "🚀 Setting up Order Execution Engine..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL and Redis)..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if ! docker ps | grep -q order-engine-postgres; then
    echo "❌ PostgreSQL container is not running."
    exit 1
fi

if ! docker ps | grep -q order-engine-redis; then
    echo "❌ Redis container is not running."
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure if needed"
echo "2. Run 'npm run build' to build the project"
echo "3. Run 'npm start' to start the server"
echo ""
echo "The server will be available at http://localhost:3000"


