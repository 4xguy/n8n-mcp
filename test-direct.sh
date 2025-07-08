#!/bin/bash

# Direct test of n8n-mcp server without inspector

echo "🔍 Direct MCP Server Test"
echo "========================"
echo ""

# Test the mcp-remote connection directly
echo "Testing mcp-remote connection to your Railway server..."
echo ""

npx -y @modelcontextprotocol/mcp-remote@latest connect \
  --header "Authorization: Bearer Ty97AAOUih+Q5UOhujKm3bEkYltX6RKgNgxPa4Pfmy4=" \
  https://n8n-mcp-production-c68a.up.railway.app/mcp