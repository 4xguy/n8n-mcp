#!/bin/bash

# Test OAuth flow for n8n-mcp
SERVER_URL="https://n8n-mcp-production-c68a.up.railway.app"

echo "1. Testing OAuth metadata endpoint..."
curl -s "$SERVER_URL/.well-known/oauth-authorization-server" | python3 -m json.tool

echo -e "\n2. Registering OAuth client..."
CLIENT_RESPONSE=$(curl -s -X POST "$SERVER_URL/oauth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "MCP Inspector Test",
    "redirect_uris": ["http://localhost:8080/callback"],
    "grant_types": ["authorization_code"],
    "response_types": ["code"],
    "scope": "read"
  }')

echo "$CLIENT_RESPONSE" | python3 -m json.tool

# Extract client credentials
CLIENT_ID=$(echo "$CLIENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['client_id'])")
CLIENT_SECRET=$(echo "$CLIENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['client_secret'])")

echo -e "\nClient ID: $CLIENT_ID"
echo "Client Secret: $CLIENT_SECRET"

echo -e "\n3. Authorization URL:"
AUTH_URL="$SERVER_URL/oauth/authorize?client_id=$CLIENT_ID&redirect_uri=http://localhost:8080/callback&response_type=code&scope=read&state=test123"
echo "$AUTH_URL"

echo -e "\n4. Getting authorization code (this will redirect)..."
AUTH_RESPONSE=$(curl -s -L -N "$AUTH_URL" 2>&1)
AUTH_CODE=$(echo "$AUTH_RESPONSE" | grep -oP '(?<=code=)[^&\\]+' | head -1 | sed 's/\\u0026.*//')

if [ -z "$AUTH_CODE" ]; then
  echo "Failed to get authorization code. Full response:"
  echo "$AUTH_RESPONSE" | head -100
else
  echo "Authorization code: $AUTH_CODE"
  
  echo -e "\n5. Exchanging code for token..."
  TOKEN_RESPONSE=$(curl -s -X POST "$SERVER_URL/oauth/token" \
    -H "Content-Type: application/json" \
    -d "{
      \"grant_type\": \"authorization_code\",
      \"code\": \"$AUTH_CODE\",
      \"redirect_uri\": \"http://localhost:8080/callback\",
      \"client_id\": \"$CLIENT_ID\",
      \"client_secret\": \"$CLIENT_SECRET\"
    }")
  
  echo "$TOKEN_RESPONSE" | python3 -m json.tool
  
  # Extract access token
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('access_token', ''))" 2>/dev/null)
  
  if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "\n6. Testing MCP endpoint with OAuth token..."
    curl -s -X POST "$SERVER_URL/mcp" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d '{
        "jsonrpc": "2.0",
        "method": "initialize",
        "params": {},
        "id": 1
      }' | python3 -m json.tool
  fi
fi