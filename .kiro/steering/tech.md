# Technology Stack

## Platform

**Raindrop Framework** (`@liquidmetal-ai/raindrop-framework` v0.11.0) - Serverless platform for AI-powered applications with built-in SmartBucket, SmartMemory, and SmartSQL capabilities.

## Runtime & Language

- **TypeScript 5.0.4** with strict mode enabled
- **Node.js 18+** required
- **ES2022** module system and target

## Core Dependencies

- **Hono 4.x** - Lightweight web framework for HTTP services
- **Zod 3.x** - Runtime type validation and schema definition
- **Kysely 0.27.2** - Type-safe SQL query builder
- **kysely-d1 0.3.0** - Kysely dialect for Cloudflare D1
- **@modelcontextprotocol/sdk 1.x** - Model Context Protocol integration

## Development Tools

- **Vitest 3.1.3** - Unit testing framework
- **TypeScript ESLint 8.7.0** - Linting
- **Prettier** - Code formatting
- **shx** - Cross-platform shell commands

## Common Commands

```bash
# Build TypeScript
npm run build

# Deploy and start application
npm run start
# or
raindrop build deploy --start

# Stop application
npm run stop

# Restart (redeploy)
npm run restart

# Run tests
npm test

# Watch mode tests
npm run test:watch

# Format code
npm run format

# Lint code
npm run lint

# Validate manifest
raindrop build validate

# Generate types from manifest
raindrop build generate

# View logs
raindrop logs tail

# Check deployment status
raindrop build status
```

## TypeScript Configuration

- Strict mode enabled with `noUncheckedIndexedAccess`
- ES2022 lib and module system
- Bundler module resolution
- Declaration files generated
- Isolated modules for better performance

## Raindrop Resources

All Raindrop resources (SmartBucket, SmartMemory, SmartSQL, queues) are accessed via environment bindings. Resource names from the manifest are converted to uppercase with underscores (e.g., `documents` → `env.DOCUMENTS`).
