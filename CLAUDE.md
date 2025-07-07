# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

n8n-mcp is a Model Context Protocol (MCP) server that provides AI assistants with complete access to n8n node information. It serves as a bridge between n8n's workflow automation platform and AI models.

## Key Commands

```bash
# Development
npm install          # Install dependencies
npm run build        # Build TypeScript (required before running)
npm run dev          # Build + rebuild database + validate
npm test             # Run Jest tests
npm run typecheck    # TypeScript type checking
npm run lint         # Check TypeScript types (alias for typecheck)

# Core Commands
npm run rebuild      # Rebuild node database from n8n packages
npm run rebuild:optimized  # Build database with embedded source code
npm run validate     # Validate critical nodes
npm run test-nodes   # Test critical node properties/operations

# Production
npm start            # Run built application (stdio mode)
npm run start:http   # Run in HTTP mode for remote access

# Docker
docker compose up -d        # Start with Docker Compose
./scripts/test-docker.sh    # Test Docker deployment

# Templates
npm run fetch:templates   # Fetch workflow templates from n8n.io
npm run test:templates    # Test template functionality

# Testing specific features
npm run test:workflow-validation   # Test workflow validation
npm run test:workflow-diff        # Test workflow diff engine
npm run test:n8n-manager         # Test n8n management tools
```

## High-Level Architecture

### Core Components
- **Database Layer**: SQLite with automatic adapter selection (better-sqlite3 or sql.js fallback)
- **MCP Server** (`src/mcp/server.ts`): Implements MCP protocol with 30+ tools
- **Services** (`src/services/`): Business logic for validation, documentation, templates
- **HTTP Server**: Multiple implementations for different deployment scenarios

### Key Services
- **NodeDocumentationService**: Main database service with FTS5 search
- **WorkflowValidator**: Complete workflow validation (structure, config, expressions)
- **WorkflowDiffEngine**: Token-efficient workflow updates using diff operations
- **PropertyFilter**: Returns only essential node properties (95% size reduction)
- **TemplateService**: 10,000+ workflow templates from n8n.io

### Database Schema
- **nodes**: Core node information with FTS5 indexing
- **node_documentation**: Parsed markdown documentation
- **node_examples**: Generated workflow examples
- **node_source_code**: Complete TypeScript/JavaScript implementations
- **workflow_templates**: n8n.io templates with metadata

## Development Workflow

### Initial Setup
1. Clone n8n-docs: `git clone https://github.com/n8n-io/n8n-docs.git ../n8n-docs`
2. Install: `npm install`
3. Build: `npm run build`
4. Rebuild database: `npm run rebuild`
5. Validate: `npm run validate`

### Testing
```bash
npm run build        # Always build first
npm test             # Run all unit tests
npm run test:*       # Run specific test suites
```

### Adding New Features
1. Create service in `src/services/` following existing patterns
2. Add MCP tool definition in `src/mcp/tools.ts`
3. Implement handler in `src/mcp/server.ts`
4. Add tests in `src/__tests__/`
5. Update documentation if needed

## Environment Configuration

Key environment variables (see `.env.example`):
```bash
# Server
MCP_MODE=stdio|http       # Operation mode
AUTH_TOKEN=your-token     # Required for HTTP mode
PORT=3000                 # HTTP server port

# Optional n8n API (enables management tools)
N8N_API_URL=https://your-n8n.com
N8N_API_KEY=your-api-key

# Logging
LOG_LEVEL=info
TRUST_PROXY=0            # Set to 1 when behind reverse proxy
```

## Architecture Patterns

### Service Layer
- All business logic in `src/services/`
- Clear separation of concerns
- Dependency injection where appropriate
- Comprehensive error handling

### Database Adapter Pattern
- Automatic fallback for Node.js compatibility
- Primary: `better-sqlite3` for performance
- Fallback: `sql.js` for compatibility
- Transparent to application code

### MCP Tool Pattern
- Structured tool definitions with validation
- Progressive disclosure (essentials → full info)
- Token-efficient responses

### Error Handling
- Custom error types for different scenarios
- Comprehensive logging with context
- User-friendly error messages

## Docker Deployment

**Important**: Docker images contain NO n8n dependencies at runtime
- 82% smaller images (~280MB vs ~1.5GB)
- Pre-built database required (`npm run rebuild` before Docker build)
- Multi-architecture support (amd64, arm64)

```bash
# Build database first (requires n8n locally)
npm run rebuild

# Deploy with Docker
docker compose up -d
```

## Key Features

### MCP Tools (30+)
- **Discovery**: `list_nodes`, `search_nodes`, `list_ai_tools`
- **Node Info**: `get_node_info`, `get_node_essentials` (95% smaller)
- **Validation**: `validate_workflow`, `validate_node_operation`
- **Templates**: `search_templates`, `get_template`
- **n8n Management** (when API configured): `n8n_create_workflow`, `n8n_update_partial_workflow`

### Workflow Diff Engine (v2.7.0)
- 13 operations: addNode, removeNode, updateNode, etc.
- 80-90% token savings vs full updates
- Transactional with validation
- Order-independent operations

### AI-Optimized Tools (v2.4.0)
- `get_node_essentials`: Returns only 10-20 essential properties
- `get_node_for_task`: Pre-configured settings for common tasks
- Progressive disclosure pattern

## Common Issues & Solutions

### Node.js Version Mismatch
The project automatically handles this with database adapter fallback.

### HTTP Server Authentication
Always use Bearer token: `Authorization: Bearer your-token`

### Docker Container Names
Claude Desktop may have issues with duplicate container names. See Issue #13.

### Workflow Validation
- Use appropriate profile: strict (deployment) vs minimal (editing)
- Check structure, configuration, and expressions
- Validate before deployment to n8n

## Performance Optimization

### Token Economy
- Use `get_node_essentials` instead of `get_node_info` (95% smaller)
- Use `n8n_update_partial_workflow` for updates (80-90% savings)
- Enable caching where appropriate

### Database Performance
- FTS5 for fast text search
- In-memory caching for frequently accessed data
- Prepared statements for all queries

## Security Considerations

- Bearer token authentication for HTTP mode
- Non-root Docker container execution
- No credentials in code or logs
- Environment-based configuration
- Validate all user inputs

## License

MIT License - Created by Romuald Czlonkowski @ www.aiadvisors.pl/en