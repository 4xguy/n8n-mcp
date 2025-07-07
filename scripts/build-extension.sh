#!/bin/bash

# Build script for Claude Desktop Extension (.dxt)

set -e

echo "Building n8n MCP Remote Extension..."

# Create temp directory for extension
TEMP_DIR=$(mktemp -d)
EXT_DIR="$TEMP_DIR/n8n-mcp-remote"

# Create extension structure
mkdir -p "$EXT_DIR"

# Copy extension files
cp extension/manifest.json "$EXT_DIR/"
cp extension/README.md "$EXT_DIR/"

# Create a simple icon if it doesn't exist
if [ ! -f extension/icon.png ]; then
    echo "Creating placeholder icon..."
    # Create a 128x128 blue square as placeholder
    convert -size 128x128 xc:'#0084ff' "$EXT_DIR/icon.png" 2>/dev/null || \
    echo "Note: Install ImageMagick to generate icon automatically"
fi

# Copy icon if it exists
[ -f extension/icon.png ] && cp extension/icon.png "$EXT_DIR/"

# Create the .dxt package
cd "$TEMP_DIR"

# Check if dxt CLI is installed
if ! command -v dxt &> /dev/null; then
    echo "Installing @anthropic-ai/dxt CLI..."
    npm install -g @anthropic-ai/dxt
fi

# Pack the extension
echo "Packing extension..."
dxt pack n8n-mcp-remote

# Move the .dxt file to the project root
mv *.dxt ../n8n-mcp-remote.dxt

# Clean up
cd ..
rm -rf "$TEMP_DIR"

echo "✅ Extension built successfully: n8n-mcp-remote.dxt"
echo ""
echo "To install:"
echo "1. Open Claude Desktop"
echo "2. Double-click n8n-mcp-remote.dxt"
echo "3. Enter your Railway server URL and auth token"
echo "4. Click Install"