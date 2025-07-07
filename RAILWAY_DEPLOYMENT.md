# Railway Deployment Guide for n8n-mcp

This guide walks you through deploying n8n-mcp to Railway.

## Prerequisites

- GitHub repository with n8n-mcp code
- Railway account (https://railway.app)
- Generated AUTH_TOKEN (already in your .env file)

## Deployment Steps

### 1. Create New Project in Railway

1. Log in to Railway Dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select the `n8n-mcp` repository

### 2. Configure Environment Variables

In the Railway project settings, add these environment variables:

```bash
# Required - Copy from your .env file
AUTH_TOKEN=Ty97AAOUih+Q5UOhujKm3bEkYltX6RKgNgxPa4Pfmy4=

# Required for HTTP mode
MCP_MODE=http
USE_FIXED_HTTP=true
NODE_ENV=production

# Railway-specific
TRUST_PROXY=1

# Optional but recommended
LOG_LEVEL=info

# Your n8n API credentials (optional - enables management tools)
N8N_API_URL=https://n8n.icvida.org
N8N_API_KEY=<your-api-key-from-env-file>
```

**Note**: Railway automatically provides the `PORT` environment variable.

### 3. Deploy

1. Railway will automatically detect the Node.js project
2. It will run the build commands specified in `nixpacks.toml`
3. Monitor the deployment logs in Railway dashboard

### 4. Get Your Service URL

Once deployed, Railway will provide a public URL like:
```
https://n8n-mcp-production.up.railway.app
```

### 5. Test the Deployment

Test the health endpoint:
```bash
curl https://your-app.up.railway.app/health
```

Test MCP endpoint with authentication:
```bash
curl -X POST https://your-app.up.railway.app/mcp \
  -H "Authorization: Bearer Ty97AAOUih+Q5UOhujKm3bEkYltX6RKgNgxPa4Pfmy4=" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

## Using with Claude Desktop

Configure Claude Desktop to use your Railway deployment:

```json
{
  "mcpServers": {
    "n8n-remote": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/mcp-remote@latest",
        "connect",
        "https://your-app.up.railway.app/mcp"
      ],
      "env": {
        "MCP_AUTH_TOKEN": "Ty97AAOUih+Q5UOhujKm3bEkYltX6RKgNgxPa4Pfmy4="
      }
    }
  }
}
```

## Monitoring & Logs

- View logs in Railway dashboard under "Deployments"
- Monitor health checks at `/health` endpoint
- Check memory usage (should be ~256-512MB)

## Security Notes

1. **Never commit .env file** - It's properly gitignored
2. **Keep AUTH_TOKEN secure** - Rotate if compromised
3. **Use HTTPS only** - Railway provides this automatically
4. **Monitor access logs** - Check for unauthorized attempts

## Troubleshooting

### Service won't start
- Check logs for errors
- Verify all required environment variables are set
- Ensure AUTH_TOKEN is present

### Authentication errors
- Verify AUTH_TOKEN matches in Railway and client
- Check Authorization header format: `Bearer <token>`

### Memory issues
- n8n-mcp typically uses 256-512MB
- If OOM errors occur, upgrade Railway plan

## Updating

To update your deployment:
1. Push changes to GitHub
2. Railway will automatically redeploy
3. Monitor deployment logs

## Support

For issues specific to:
- n8n-mcp: https://github.com/czlonkowski/n8n-mcp/issues
- Railway: https://railway.app/help