# Technology Stack

## Framework & Runtime

- **Raindrop Framework** (`@liquidmetal-ai/raindrop-framework` v0.11.0): Core application framework
- **Hono.js** (v4): Lightweight web framework for HTTP services
- **TypeScript** (v5.0.4): Primary language with strict mode enabled
- **Node.js**: 18+ required

## Key Dependencies

- **Kysely** (v0.27.2): Type-safe SQL query builder
- **Kysely-D1** (v0.3.0): D1 database adapter
- **Zod** (v3): Schema validation
- **MCP SDK** (`@modelcontextprotocol/sdk` v1): Model Context Protocol integration

## Development Tools

- **Vitest** (v3.1.3): Testing framework
- **TypeScript ESLint** (v8.7.0): Linting
- **Prettier**: Code formatting
- **shx**: Cross-platform shell commands

## Build System

TypeScript compilation with ES2022 target and module system. Output goes to `dist/` directory.

### Compiler Configuration

- Module: ES2022 with Bundler resolution
- Strict mode enabled
- No unchecked indexed access
- Isolated modules for better performance

## Common Commands

```bash
# Build TypeScript
npm run build

# Deploy and start application
npm run start

# Stop application
npm run stop

# Restart (redeploy)
npm run restart

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Format code
npm run format

# Lint code
npm run lint
```

## Raindrop CLI Commands

```bash
# Validate manifest
raindrop build validate

# Generate types and scaffolding
raindrop build generate

# Deploy application
raindrop build deploy --start

# Check status
raindrop build status

# View logs
raindrop logs tail
raindrop logs query --since 30s
```

## Database Migrations

Migrations are stored in `db/<db_name>/` with naming pattern `NNNN_description.sql`. They execute automatically during deployment in alphabetical order.
