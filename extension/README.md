# n8n MCP Remote Extension

Connect Claude Desktop to your n8n workflow automation platform through the Model Context Protocol (MCP).

## Features

- 🔍 **Search & Discover**: Access documentation for 500+ n8n nodes
- 🛠️ **Create Workflows**: Build and validate n8n workflows with AI assistance
- 📊 **Manage Automations**: Create, update, and trigger workflows remotely
- 🤖 **AI Tool Integration**: Use n8n nodes as AI tools in your workflows
- 📚 **Template Library**: Access 10,000+ pre-built workflow templates

## One-Click Installation

1. Download the `n8n-mcp-remote.dxt` file
2. Double-click to open in Claude Desktop
3. Enter your server URL and authentication token
4. Click "Install"

## Configuration

You'll need:
- **Server URL**: Your Railway deployment URL (e.g., `https://n8n-mcp-production.up.railway.app`)
- **Auth Token**: The AUTH_TOKEN from your server configuration

## Available Tools

Once connected, you'll have access to 30+ MCP tools including:
- `list_nodes` - Browse all available n8n nodes
- `get_node_essentials` - Get essential configuration for any node
- `search_templates` - Find workflow templates
- `validate_workflow` - Validate workflows before deployment
- `n8n_create_workflow` - Create new workflows (if n8n API configured)
- And many more...

## Security

- All connections use HTTPS
- Authentication via secure bearer tokens
- Tokens stored in your OS keychain
- No data is stored locally

## Support

- GitHub: https://github.com/4xguy/n8n-mcp
- Issues: https://github.com/4xguy/n8n-mcp/issues

## License

MIT License - Free for personal and commercial use