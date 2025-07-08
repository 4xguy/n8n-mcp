#!/bin/bash

# Test OAuth flow specifically for MCP Inspector
SERVER_URL="https://n8n-mcp-production-c68a.up.railway.app"
REDIRECT_URI="http://localhost:8274/oauth/callback/debug"

echo "1. Registering OAuth client with MCP Inspector redirect URI..."
CLIENT_RESPONSE=$(curl -s -X POST "$SERVER_URL/oauth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_name\": \"MCP Inspector\",
    \"redirect_uris\": [\"$REDIRECT_URI\"],
    \"grant_types\": [\"authorization_code\"],
    \"response_types\": [\"code\"],
    \"scope\": \"read write admin\"
  }")

echo "$CLIENT_RESPONSE" | python3 -m json.tool

# Extract client credentials
CLIENT_ID=$(echo "$CLIENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['client_id'])")
CLIENT_SECRET=$(echo "$CLIENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['client_secret'])")

echo -e "\nClient ID: $CLIENT_ID"
echo "Client Secret: $CLIENT_SECRET"

echo -e "\n2. Authorization URL for MCP Inspector:"
AUTH_URL="$SERVER_URL/oauth/authorize?client_id=$CLIENT_ID&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&response_type=code&scope=read&state=test123"
echo "$AUTH_URL"

echo -e "\n3. Simulating authorization (this will redirect)..."
AUTH_RESPONSE=$(curl -s -L -N "$AUTH_URL" 2>&1)

# Try to extract the code - handle both regular and HTML-encoded responses
AUTH_CODE=$(echo "$AUTH_RESPONSE" | grep -oP '(?<=code=)[^&\s]+' | head -1 | sed 's/\\u0026.*//' | sed 's/\\.*//')

if [ -z "$AUTH_CODE" ]; then
  echo "Failed to get authorization code. Trying alternative extraction..."
  # Alternative extraction method
  AUTH_CODE=$(echo "$AUTH_RESPONSE" | sed -n 's/.*code=\([^&]*\).*/\1/p' | head -1)
fi

echo "Authorization code: $AUTH_CODE"

if [ -n "$AUTH_CODE" ]; then
  echo -e "\n4. Testing token exchange with different content types..."
  
  echo -e "\n4a. Testing with application/json (standard)..."
  TOKEN_RESPONSE=$(curl -s -X POST "$SERVER_URL/oauth/token" \
    -H "Content-Type: application/json" \
    -d "{
      \"grant_type\": \"authorization_code\",
      \"code\": \"$AUTH_CODE\",
      \"redirect_uri\": \"$REDIRECT_URI\",
      \"client_id\": \"$CLIENT_ID\",
      \"client_secret\": \"$CLIENT_SECRET\"
    }")
  
  echo "Response: $TOKEN_RESPONSE"
  
  echo -e "\n4b. Testing with application/x-www-form-urlencoded..."
  TOKEN_RESPONSE_FORM=$(curl -s -X POST "$SERVER_URL/oauth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code&code=$AUTH_CODE&redirect_uri=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI'))")&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET")
  
  echo "Response: $TOKEN_RESPONSE_FORM"
  
  echo -e "\n4c. Testing with verbose output..."
  echo "Request details:"
  echo "URL: $SERVER_URL/oauth/token"
  echo "Body parameters:"
  echo "  grant_type: authorization_code"
  echo "  code: $AUTH_CODE"
  echo "  redirect_uri: $REDIRECT_URI"
  echo "  client_id: $CLIENT_ID"
  echo "  client_secret: $CLIENT_SECRET"
  
  curl -v -X POST "$SERVER_URL/oauth/token" \
    -H "Content-Type: application/json" \
    -d "{
      \"grant_type\": \"authorization_code\",
      \"code\": \"$AUTH_CODE\",
      \"redirect_uri\": \"$REDIRECT_URI\",
      \"client_id\": \"$CLIENT_ID\",
      \"client_secret\": \"$CLIENT_SECRET\"
    }" 2>&1 | grep -E "(< HTTP|< |{|error)"
fi