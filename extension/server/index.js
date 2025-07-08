#!/usr/bin/env node

/**
 * n8n MCP Remote Connection Server
 * This server acts as a bridge to connect to a remote n8n-mcp instance
 */

const { spawn } = require('child_process');
const path = require('path');

// Get configuration from command line arguments
const args = process.argv.slice(2);
let serverUrl = '';
let authToken = '';

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--server-url' && args[i + 1]) {
    serverUrl = args[i + 1];
    i++;
  } else if (args[i] === '--auth-token' && args[i + 1]) {
    authToken = args[i + 1];
    i++;
  }
}

// Debug logging
console.error(`[DEBUG] Starting n8n MCP Remote bridge`);
console.error(`[DEBUG] Server URL: ${serverUrl}`);
console.error(`[DEBUG] Auth Token: ${authToken ? '***' + authToken.slice(-4) : 'NOT SET'}`);

if (!serverUrl || !authToken) {
  console.error('Error: Missing required configuration');
  console.error('Usage: node index.js --server-url <url> --auth-token <token>');
  process.exit(1);
}

// Construct the mcp-remote command
const mcpArgs = [
  '-y',
  '@modelcontextprotocol/mcp-remote@latest',
  'connect',
  '--header',
  `Authorization: Bearer ${authToken}`,
  `${serverUrl}/mcp`
];

console.error(`[DEBUG] Running command: npx ${mcpArgs.join(' ')}`);

// Spawn the mcp-remote process
const mcpProcess = spawn('npx', mcpArgs, {
  stdio: 'inherit',
  env: process.env
});

// Handle process exit
mcpProcess.on('error', (error) => {
  console.error('[ERROR] Failed to start mcp-remote:', error);
  process.exit(1);
});

mcpProcess.on('exit', (code) => {
  console.error(`[DEBUG] mcp-remote exited with code: ${code}`);
  process.exit(code || 0);
});