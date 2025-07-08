#!/bin/bash

# Test n8n-mcp server functionality

SERVER_URL="https://n8n-mcp-production-c68a.up.railway.app"
AUTH_TOKEN="Ty97AAOUih+Q5UOhujKm3bEkYltX6RKgNgxPa4Pfmy4="

echo "🧪 Testing n8n-mcp server at $SERVER_URL"
echo ""

# Test 1: Health check
echo "1️⃣ Health Check:"
curl -s "$SERVER_URL/health" | python3 -m json.tool
echo ""

# Test 2: List tools via MCP endpoint
echo "2️⃣ List MCP Tools:"
curl -s -X POST "$SERVER_URL/mcp" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' \
  | python3 -m json.tool | head -50
echo ""

# Test 3: Get node info
echo "3️⃣ Test get_node_essentials tool:"
curl -s -X POST "$SERVER_URL/mcp" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_node_essentials",
      "arguments": {
        "nodeType": "n8n-nodes-base.httpRequest"
      }
    },
    "id": 2
  }' \
  | python3 -m json.tool | head -30

echo ""
echo "✅ Tests complete!"