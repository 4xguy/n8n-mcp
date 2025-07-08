/**
 * OAuth 2.0 Server Implementation for Claude.ai Integration
 * Implements Dynamic Client Registration (RFC7591) and OAuth 2.0 Authorization Server Metadata (RFC8414)
 */

import express from 'express';
import crypto from 'crypto';
import { logger } from './utils/logger';

interface OAuthClient {
  client_id: string;
  client_secret: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
  created_at: number;
}

interface AuthorizationCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  scope: string;
  expires_at: number;
}

interface AccessToken {
  token: string;
  client_id: string;
  scope: string;
  expires_at: number;
}

export class OAuthServer {
  private clients: Map<string, OAuthClient> = new Map();
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private accessTokens: Map<string, AccessToken> = new Map();
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * OAuth 2.0 Authorization Server Metadata (RFC8414)
   * Required by MCP specification
   */
  getMetadata() {
    return {
      issuer: this.baseUrl,
      authorization_endpoint: `${this.baseUrl}/oauth/authorize`,
      token_endpoint: `${this.baseUrl}/oauth/token`,
      registration_endpoint: `${this.baseUrl}/oauth/register`,
      scopes_supported: ["read", "write", "admin"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
      service_documentation: `${this.baseUrl}/docs`,
      ui_locales_supported: ["en-US"],
    };
  }

  /**
   * Dynamic Client Registration (RFC7591)
   * Required by Claude.ai
   */
  async registerClient(req: express.Request): Promise<OAuthClient> {
    const {
      client_name,
      redirect_uris,
      grant_types = ["authorization_code"],
      response_types = ["code"],
      scope = "read",
    } = req.body;

    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris)) {
      throw new Error("client_name and redirect_uris are required");
    }

    const client: OAuthClient = {
      client_id: crypto.randomBytes(16).toString('hex'),
      client_secret: crypto.randomBytes(32).toString('hex'),
      client_name,
      redirect_uris,
      grant_types,
      response_types,
      scope,
      created_at: Date.now(),
    };

    this.clients.set(client.client_id, client);
    logger.info(`Registered new OAuth client: ${client_name} (${client.client_id})`);

    return client;
  }

  /**
   * Authorization endpoint
   * Handles the authorization request from Claude.ai
   */
  async authorize(req: express.Request): Promise<string> {
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
    } = req.query;

    // Validate client
    const client = this.clients.get(client_id as string);
    if (!client) {
      throw new Error("Invalid client_id");
    }

    // Validate redirect_uri
    if (!client.redirect_uris.includes(redirect_uri as string)) {
      throw new Error("Invalid redirect_uri");
    }

    // Generate authorization code
    const code = crypto.randomBytes(32).toString('hex');
    const authCode: AuthorizationCode = {
      code,
      client_id: client_id as string,
      redirect_uri: redirect_uri as string,
      scope: scope as string || "read",
      expires_at: Date.now() + (10 * 60 * 1000), // 10 minutes
    };

    this.authorizationCodes.set(code, authCode);

    // Build redirect URL
    const redirectUrl = new URL(redirect_uri as string);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state as string);
    }

    return redirectUrl.toString();
  }

  /**
   * Token endpoint
   * Exchanges authorization code for access token
   */
  async exchangeToken(req: express.Request): Promise<any> {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier,
    } = req.body;

    if (grant_type !== 'authorization_code') {
      throw new Error("Unsupported grant_type");
    }

    // Validate client credentials
    const client = this.clients.get(client_id);
    if (!client || client.client_secret !== client_secret) {
      throw new Error("Invalid client credentials");
    }

    // Validate authorization code
    const authCode = this.authorizationCodes.get(code);
    if (!authCode || authCode.expires_at < Date.now()) {
      throw new Error("Invalid or expired authorization code");
    }

    if (authCode.client_id !== client_id || authCode.redirect_uri !== redirect_uri) {
      throw new Error("Invalid authorization code");
    }

    // Remove used authorization code
    this.authorizationCodes.delete(code);

    // Generate access token
    const accessToken = crypto.randomBytes(32).toString('hex');
    const tokenData: AccessToken = {
      token: accessToken,
      client_id,
      scope: authCode.scope,
      expires_at: Date.now() + (60 * 60 * 1000), // 1 hour
    };

    this.accessTokens.set(accessToken, tokenData);

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: authCode.scope,
    };
  }

  /**
   * Validate access token
   * Used to protect MCP endpoints
   */
  validateToken(token: string): boolean {
    const tokenData = this.accessTokens.get(token);
    if (!tokenData || tokenData.expires_at < Date.now()) {
      return false;
    }
    return true;
  }

  /**
   * Clean up expired tokens and codes
   */
  cleanup() {
    const now = Date.now();
    
    // Clean expired authorization codes
    for (const [code, data] of this.authorizationCodes.entries()) {
      if (data.expires_at < now) {
        this.authorizationCodes.delete(code);
      }
    }

    // Clean expired access tokens
    for (const [token, data] of this.accessTokens.entries()) {
      if (data.expires_at < now) {
        this.accessTokens.delete(token);
      }
    }
  }
}

/**
 * OAuth middleware for Express
 */
export function createOAuthMiddleware(oauthServer: OAuthServer) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip OAuth for metadata and OAuth endpoints
    if (req.path.startsWith('/oauth') || req.path.startsWith('/.well-known')) {
      return next();
    }

    // Also allow bearer token authentication for backward compatibility
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      // Check if it's an OAuth token
      if (oauthServer.validateToken(token)) {
        return next();
      }
      
      // Check if it's the static token (backward compatibility)
      if (token === process.env.AUTH_TOKEN) {
        return next();
      }
    }

    res.status(401).json({ error: 'Unauthorized' });
  };
}