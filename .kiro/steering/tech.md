---
inclusion: always
---

# Technology Stack

## Core Framework

- **Raindrop Framework** (`@liquidmetal-ai/raindrop-framework` v0.11.0) - Serverless application framework
- **TypeScript** (v5.0.4) - Primary language with strict mode enabled
- **Node.js** - Runtime environment

## Web Framework

- **Hono** (v4) - Lightweight web framework for services
- **Zod** (v3) - Runtime type validation and schema definition

## Database & Storage

- **Kysely** (v0.27.2) - Type-safe SQL query builder
- **Kysely-D1** (v0.3.0) - Cloudflare D1 adapter

## Testing

- **Vitest** (v3.1.3) - Unit testing framework
- Test files use `.test.ts` extension
- Mocks located in `src/_test/mocks.ts`

## Build System

- **TypeScript Compiler** - Compiles to ES2022 with bundler module resolution
- **tsx** - TypeScript execution for scripts
- **shx** - Cross-platform shell commands

## Common Commands

```bash
# Development
npm run generate          # Generate types from manifest
npm run build            # Compile TypeScript
npm run validate         # Validate manifest

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:smartbucket # SmartBucket validation tests
npm run validate:smartbucket # Pre-deployment validation

# Deployment
npm run predeploy        # Full validation (build + validate + test)
npm run start            # Deploy and start
npm run stop             # Stop deployment
npm run restart          # Redeploy

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier
```

## TypeScript Configuration

- Target: ES2022
- Module: ES2022 with bundler resolution
- Strict mode enabled
- No unchecked indexed access
- Isolated modules for faster compilation
- Declaration maps for debugging
