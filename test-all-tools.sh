#!/bin/bash

# Comprehensive test of n8n-mcp server tools

SERVER="https://n8n-mcp-production-c68a.up.railway.app"
TOKEN="Ty97AAOUih+Q5UOhujKm3bEkYltX6RKgNgxPa4Pfmy4="

echo "🧪 Comprehensive n8n-mcp Server Test"
echo "===================================="
echo ""

# Function to make MCP calls
mcp_call() {
    local method=$1
    local params=$2
    curl -s -X POST "$SERVER/mcp" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}" \
        | python3 -m json.tool
}

# Test 1: Initialize
echo "1️⃣ Initialize MCP Session:"
mcp_call "initialize" '{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}'
echo -e "\n"

# Test 2: List available tools
echo "2️⃣ List Available Tools (first 5):"
mcp_call "tools/list" '{}' | head -100
echo -e "\n"

# Test 3: Search for HTTP nodes
echo "3️⃣ Search for HTTP-related nodes:"
mcp_call "tools/call" '{
    "name": "search_nodes",
    "arguments": {
        "query": "http",
        "limit": 5
    }
}'
echo -e "\n"

# Test 4: Get database statistics
echo "4️⃣ Get Database Statistics:"
mcp_call "tools/call" '{
    "name": "get_database_statistics",
    "arguments": {}
}'
echo -e "\n"

# Test 5: List AI tools
echo "5️⃣ List AI Tools (first 5):"
mcp_call "tools/call" '{
    "name": "list_ai_tools",
    "arguments": {
        "limit": 5
    }
}'
echo -e "\n"

echo "✅ All tests complete!"