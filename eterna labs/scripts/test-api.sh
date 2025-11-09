#!/bin/bash

# Simple API test script

BASE_URL="http://localhost:3000"

echo "🧪 Testing Order Execution Engine API..."
echo ""

# Health check
echo "1. Health Check..."
curl -s "$BASE_URL/health" | jq .
echo ""

# Create order
echo "2. Creating order..."
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "market",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 100,
    "slippageTolerance": 0.01
  }')

echo "$ORDER_RESPONSE" | jq .

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.orderId')
echo "Order ID: $ORDER_ID"
echo ""

# Wait a bit for processing
echo "⏳ Waiting for order processing..."
sleep 3

# Get order status
echo "3. Getting order status..."
curl -s "$BASE_URL/api/orders/$ORDER_ID" | jq .
echo ""

# Get queue metrics
echo "4. Getting queue metrics..."
curl -s "$BASE_URL/api/queue/metrics" | jq .
echo ""

echo "✅ API tests complete!"


