#!/bin/bash

# MCP Inspector test script for n8n-mcp Railway deployment

SERVER_URL="${SERVER_URL:-https://n8n-mcp-production-c68a.up.railway.app}"
AUTH_TOKEN="${AUTH_TOKEN:-Ty97AAOUih+Q5UOhujKm3bEkYltX6RKgNgxPa4Pfmy4=}"

echo "🔍 Starting MCP Inspector for n8n-mcp server"
echo "Server: $SERVER_URL"
echo ""

# Run the inspector with mcp-remote connecting to your Railway server
npx -y @modelcontextprotocol/inspector \
  npx -y @modelcontextprotocol/mcp-remote@latest connect \
  --header "Authorization: Bearer $AUTH_TOKEN" \
  "$SERVER_URL/mcp"