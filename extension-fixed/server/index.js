#!/usr/bin/env node

/**
 * n8n MCP Remote Bridge
 * Connects Claude Desktop to a remote n8n-mcp server
 */

const { spawn } = require('child_process');

// Get configuration from environment variables
const serverUrl = process.env.SERVER_URL;
const authToken = process.env.AUTH_TOKEN;

// Debug to stderr (visible in Claude Desktop logs)
console.error(`[n8n-mcp-remote] Starting bridge...`);
console.error(`[n8n-mcp-remote] Server URL: ${serverUrl}`);
console.error(`[n8n-mcp-remote] Auth Token: ${authToken ? '***' + authToken.slice(-4) : 'NOT SET'}`);

if (!serverUrl || !authToken) {
  console.error('[n8n-mcp-remote] ERROR: Missing SERVER_URL or AUTH_TOKEN');
  process.exit(1);
}

// Build the mcp-remote command
const args = [
  '-y',
  '@modelcontextprotocol/mcp-remote@latest',
  'connect',
  '--header',
  `Authorization: Bearer ${authToken}`,
  `${serverUrl}/mcp`
];

console.error(`[n8n-mcp-remote] Executing: npx ${args.join(' ')}`);

// Spawn mcp-remote with inherited stdio
const child = spawn('npx', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    // Ensure npm doesn't prompt
    npm_config_yes: 'true'
  }
});

// Handle errors
child.on('error', (error) => {
  console.error('[n8n-mcp-remote] Failed to start mcp-remote:', error);
  process.exit(1);
});

// Handle exit
child.on('exit', (code, signal) => {
  console.error(`[n8n-mcp-remote] mcp-remote exited with code ${code}, signal ${signal}`);
  process.exit(code || 0);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.error('[n8n-mcp-remote] Received SIGINT, shutting down...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.error('[n8n-mcp-remote] Received SIGTERM, shutting down...');
  child.kill('SIGTERM');
});