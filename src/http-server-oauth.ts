#!/usr/bin/env node
/**
 * OAuth-enabled HTTP server for n8n-MCP with Claude.ai support
 * Implements Dynamic Client Registration for Claude.ai integration
 */
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { n8nDocumentationToolsFinal } from './mcp/tools';
import { n8nManagementTools } from './mcp/tools-n8n-manager';
import { N8NDocumentationMCPServer } from './mcp/server';
import { logger } from './utils/logger';
import { PROJECT_VERSION } from './utils/version';
import { isN8nApiConfigured } from './config/n8n-api';
import { OAuthServer, createOAuthMiddleware } from './oauth-server';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

let expressServer: any;
let authToken: string | null = null;
let oauthServer: OAuthServer;

/**
 * Load auth token from environment variable or file
 */
export function loadAuthToken(): string | null {
  // First, try AUTH_TOKEN environment variable
  if (process.env.AUTH_TOKEN) {
    logger.info('Using AUTH_TOKEN from environment variable');
    return process.env.AUTH_TOKEN;
  }
  
  // Then, try AUTH_TOKEN_FILE
  if (process.env.AUTH_TOKEN_FILE) {
    try {
      const token = readFileSync(process.env.AUTH_TOKEN_FILE, 'utf-8').trim();
      logger.info(`Loaded AUTH_TOKEN from file: ${process.env.AUTH_TOKEN_FILE}`);
      return token;
    } catch (error) {
      logger.error(`Failed to read AUTH_TOKEN_FILE: ${process.env.AUTH_TOKEN_FILE}`, error);
      console.error(`ERROR: Failed to read AUTH_TOKEN_FILE: ${process.env.AUTH_TOKEN_FILE}`);
      console.error(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
  
  return null;
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  // Load auth token from env var or file
  authToken = loadAuthToken();
  
  if (!authToken) {
    logger.error('No authentication token found');
    console.error('ERROR: AUTH_TOKEN is required for HTTP mode');
    console.error('Set AUTH_TOKEN environment variable or AUTH_TOKEN_FILE pointing to a file containing the token');
    console.error('Generate AUTH_TOKEN with: openssl rand -base64 32');
    process.exit(1);
  }
  
  if (authToken.length < 32) {
    logger.warn('AUTH_TOKEN should be at least 32 characters for security');
    console.warn('WARNING: AUTH_TOKEN should be at least 32 characters for security');
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  logger.info('Shutting down HTTP server...');
  console.log('Shutting down HTTP server...');
  
  if (expressServer) {
    expressServer.close(() => {
      logger.info('HTTP server closed');
      console.log('HTTP server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

export async function startOAuthHTTPServer() {
  validateEnvironment();
  
  const app = express();
  
  // Parse JSON and URL-encoded for OAuth endpoints (not MCP)
  app.use((req, res, next) => {
    if (req.path === '/mcp') {
      // Skip parsing for MCP endpoint
      return next();
    }
    // Support both JSON and URL-encoded bodies
    express.json()(req, res, () => {
      express.urlencoded({ extended: true })(req, res, next);
    });
  });
  
  // Configure trust proxy for correct IP logging behind reverse proxies
  const trustProxy = process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 0;
  if (trustProxy > 0) {
    app.set('trust proxy', trustProxy);
    logger.info(`Trust proxy enabled with ${trustProxy} hop(s)`);
  }
  
  // Initialize OAuth server
  const port = process.env.PORT || 3000;
  const baseUrl = process.env.BASE_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN || `localhost:${port}`}`;
  oauthServer = new OAuthServer(baseUrl);
  logger.info(`OAuth server initialized with base URL: ${baseUrl}`);
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  
  // CORS configuration
  app.use((req, res, next) => {
    const allowedOrigin = process.env.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  
  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      contentLength: req.get('content-length')
    });
    next();
  });
  
  // Handle OPTIONS requests for CORS preflight
  app.options('*', (req, res) => {
    res.sendStatus(200);
  });

  // OAuth metadata endpoint (RFC8414)
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    res.json(oauthServer.getMetadata());
  });
  
  // Dynamic Client Registration endpoint (RFC7591)
  app.post('/oauth/register', async (req, res) => {
    try {
      const client = await oauthServer.registerClient(req);
      res.status(201).json({
        client_id: client.client_id,
        client_secret: client.client_secret,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        response_types: client.response_types,
        scope: client.scope,
        client_id_issued_at: Math.floor(client.created_at / 1000),
        client_secret_expires_at: 0, // Never expires
      });
    } catch (error) {
      logger.error('Client registration failed', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
    }
  });
  
  // OAuth authorization endpoint
  app.get('/oauth/authorize', async (req, res) => {
    try {
      // Log the authorization request details
      logger.info('Authorization request', {
        query: req.query,
        headers: {
          referer: req.headers['referer'],
          'user-agent': req.headers['user-agent']
        }
      });
      
      // In a real implementation, you would show a consent screen here
      // For now, we'll auto-approve all requests
      const redirectUrl = await oauthServer.authorize(req);
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Authorization failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        client_id: req.query.client_id,
        redirect_uri: req.query.redirect_uri
      });
      
      // Return a more user-friendly error page for browser requests
      if (req.headers['accept']?.includes('text/html')) {
        res.status(400).send(`
          <html>
            <head><title>Authorization Error</title></head>
            <body>
              <h1>Authorization Failed</h1>
              <p>Error: ${error instanceof Error ? error.message : 'Authorization failed'}</p>
              <p>Client ID: ${req.query.client_id || 'Not provided'}</p>
              <p>If you're connecting from Claude.ai, please ensure the MCP server URL includes /mcp at the end.</p>
            </body>
          </html>
        `);
      } else {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Authorization failed' });
      }
    }
  });
  
  // OAuth token endpoint
  app.post('/oauth/token', async (req, res) => {
    try {
      const tokenResponse = await oauthServer.exchangeToken(req);
      res.json(tokenResponse);
    } catch (error) {
      logger.error('Token exchange failed', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Token exchange failed' });
    }
  });
  
  // Apply OAuth middleware to protected endpoints
  const authMiddleware = createOAuthMiddleware(oauthServer);
  
  // Create a single persistent MCP server instance
  const mcpServer = new N8NDocumentationMCPServer();
  logger.info('Created persistent MCP server instance');

  // Health check endpoint (public)
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      mode: 'http-oauth',
      version: PROJECT_VERSION,
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      oauth: {
        enabled: true,
        metadata_url: `${baseUrl}/.well-known/oauth-authorization-server`
      },
      timestamp: new Date().toISOString()
    });
  });

  // Version endpoint (public)
  app.get('/version', (req, res) => {
    res.json({ 
      version: PROJECT_VERSION,
      buildTime: new Date().toISOString(),
      tools: n8nDocumentationToolsFinal.map(t => t.name),
      commit: process.env.GIT_COMMIT || 'unknown',
      oauth: true
    });
  });
  
  // Main MCP endpoint (protected)
  app.post('/mcp', authMiddleware, async (req: express.Request, res: express.Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Collect the raw body for processing
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      await new Promise<void>((resolve, reject) => {
        req.on('end', async () => {
          try {
            const request = JSON.parse(body);
            logger.debug('Processing MCP request', { 
              method: request.method,
              id: request.id 
            });
            
            // Handle the request based on method
            let response;
            
            switch (request.method) {
              case 'initialize':
                response = {
                  jsonrpc: '2.0',
                  result: {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                      tools: {},
                      resources: {}
                    },
                    serverInfo: {
                      name: 'n8n-documentation-mcp',
                      version: PROJECT_VERSION
                    }
                  },
                  id: request.id
                };
                break;
                
              case 'tools/list':
                // Use the proper tool list that includes management tools when configured
                const tools = [...n8nDocumentationToolsFinal];
                
                // Add management tools if n8n API is configured
                if (isN8nApiConfigured()) {
                  tools.push(...n8nManagementTools);
                }
                
                response = {
                  jsonrpc: '2.0',
                  result: {
                    tools
                  },
                  id: request.id
                };
                break;
                
              case 'tools/call':
                // Delegate to the MCP server
                const toolName = request.params?.name;
                const toolArgs = request.params?.arguments || {};
                
                try {
                  const result = await mcpServer.executeTool(toolName, toolArgs);
                  response = {
                    jsonrpc: '2.0',
                    result: {
                      content: [
                        {
                          type: 'text',
                          text: JSON.stringify(result, null, 2)
                        }
                      ]
                    },
                    id: request.id
                  };
                } catch (error) {
                  response = {
                    jsonrpc: '2.0',
                    error: {
                      code: -32603,
                      message: `Error executing tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
                    },
                    id: request.id
                  };
                }
                break;
                
              default:
                response = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32601,
                    message: `Method not found: ${request.method}`
                  },
                  id: request.id
                };
            }
            
            // Log response time
            const duration = Date.now() - startTime;
            logger.info(`MCP request completed in ${duration}ms`, {
              method: request.method,
              duration
            });
            
            // Send response
            res.json(response);
            resolve();
          } catch (error) {
            logger.error('Failed to process MCP request', error);
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal error',
                data: error instanceof Error ? error.message : 'Unknown error'
              },
              id: null
            });
            resolve();
          }
        });
        
        req.on('error', (error) => {
          logger.error('Request stream error', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Unexpected error in MCP handler', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error'
        },
        id: null
      });
    }
  });
  
  // Clean up expired tokens periodically
  setInterval(() => {
    oauthServer.cleanup();
  }, 60 * 60 * 1000); // Every hour
  
  // Start the Express server
  expressServer = app.listen(port, () => {
    logger.info(`n8n Documentation MCP Server running on port ${port}`);
    logger.info(`OAuth enabled with base URL: ${baseUrl}`);
    logger.info(`OAuth metadata available at: ${baseUrl}/.well-known/oauth-authorization-server`);
    console.log(`\nn8n Documentation MCP Server running with OAuth support`);
    console.log(`Server URL: ${baseUrl}`);
    console.log(`OAuth metadata: ${baseUrl}/.well-known/oauth-authorization-server`);
    console.log(`\nFor Claude.ai integration:`);
    console.log(`1. Add this server URL in Claude.ai integrations`);
    console.log(`2. Claude will automatically handle OAuth authentication`);
    console.log(`\nFor backward compatibility, Bearer token auth still works:`);
    console.log(`Authorization: Bearer ${authToken}`);
  });
  
  // Handle process signals
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Make executeTool public on the server
declare module './mcp/server' {
  interface N8NDocumentationMCPServer {
    executeTool(name: string, args: any): Promise<any>;
  }
}

// Start the server
if (require.main === module) {
  startOAuthHTTPServer().catch(error => {
    logger.error('Failed to start OAuth HTTP server', error);
    console.error('Failed to start OAuth HTTP server:', error);
    process.exit(1);
  });
}